"""生成前端 SDK 脚本 (OwlApi)

根据后端 swag 生成的 swagger.json 使用 orval (mode=tags + react-query) 生成 TypeScript SDK。
frontend/admin 目录下自带 orval.config.ts，本脚本只负责：

1. 读取 backend/docs/swagger.json（由 make gen-swagger 生成）
2. 剥离 Go 包前缀（e.g. http.TenantResp → TenantResp）
3. 展平 R* envelope schema（$ref: RApiEndpoint → data 字段的实际 schema）
   运行时 custom-fetch.ts 负责解包 {code, msg, data}，类型层面直接看到业务类型
4. 修复重复 operationId（swag 对同 path 不同 method 生成相同 id）
5. 落盘 spec 到 frontend/admin/openapi.json
6. 调用 pnpm orval 生成 TypeScript SDK
7. 清理临时 spec 文件
"""

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
ADMIN_ROOT = FRONTEND_DIR / "admin"

SWAGGER_FILE = BACKEND_DIR / "docs" / "swagger.json"
SPEC_OUT = ADMIN_ROOT / "openapi.json"


def load_swagger() -> dict:
    if not SWAGGER_FILE.exists():
        print(f"  ❌ swagger.json 未找到: {SWAGGER_FILE}")
        print("     请先执行: make gen-swagger")
        sys.exit(1)
    print(f"  ✅ 读取 {SWAGGER_FILE}")
    with open(SWAGGER_FILE, encoding="utf-8") as f:
        return json.load(f)


def strip_go_package_prefix(spec: dict) -> dict:
    """剥离 Go 包前缀, e.g. 'http.TenantResp' → 'TenantResp'。

    swag 在某些情况下会把包名加到 definition key 上，导致 orval 生成的类型名含点号。
    """
    defs = spec.get("definitions", {})
    if not defs:
        return spec

    renamed = {}
    for key, val in defs.items():
        new_key = re.sub(r"^[a-z]+\.", "", key)
        renamed[new_key] = val

    raw = json.dumps({**spec, "definitions": renamed})
    raw = re.sub(r'"#/definitions/[a-z]+\.', '"#/definitions/', raw)
    result = json.loads(raw)
    print(f"  ✅ Go 前缀剥离完成 ({len(defs)} definitions)")
    return result


def unwrap_envelope_schemas(spec: dict) -> None:
    """展平 R* envelope schema，在 OpenAPI 层面直接呈现业务类型。

    OwlApi 后端所有响应统一包裹 { code, msg, data } envelope，
    OpenAPI 定义为 RXxx { code: int, msg: str, data: $ref XxxResp }。

    把 paths 里所有 $ref: '#/definitions/RXxx' 替换为 data 字段的实际 schema，
    并删除 RXxx 定义本身和基础 R 定义。

    配合 custom-fetch.ts 中的 envelope 解包逻辑，业务侧直接拿到 data 层数据，
    无需 data.data 多层访问。
    """
    defs = spec.get("definitions", {})
    envelope_to_data: dict[str, dict] = {}

    for name, schema in list(defs.items()):
        props = schema.get("properties", {})
        if "code" not in props or "data" not in props or "msg" not in props:
            continue
        data_field = props.get("data") or {}
        # data 字段为空 schema 的 envelope（如基础 R）→ 展平为 { type: 'object' }
        # 这样 $ref: R 的路径响应会生成 unknown/object 而不是悬空 ref
        replacement = data_field if data_field else {"type": "object"}
        envelope_to_data[name] = json.loads(json.dumps(replacement))

    if not envelope_to_data:
        return

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            ref = node.get("$ref")
            if isinstance(ref, str) and ref.startswith("#/definitions/"):
                schema_name = ref.rsplit("/", 1)[-1]
                replacement = envelope_to_data.get(schema_name)
                if replacement is not None:
                    node.clear()
                    node.update(json.loads(json.dumps(replacement)))
                    return
            for v in list(node.values()):
                walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(spec)

    for name in envelope_to_data:
        defs.pop(name, None)

    print(f"  ✅ R* envelope 展平完成 ({len(envelope_to_data)} 个 envelope 已解包)")


def fix_duplicate_operation_ids(spec: dict) -> None:
    """修复重复的 operationId。

    swag 对同一 path 不同 HTTP method 可能生成相同 operationId（如 executeQuery），
    orval 遇到重复 id 会报错或产生命名冲突。后缀 HTTP method 使其唯一。
    """
    paths = spec.get("paths", {})
    seen: dict[str, int] = {}
    fixed = 0

    for _path, methods in paths.items():
        for method, op in methods.items():
            op_id = op.get("operationId")
            if not op_id:
                continue
            if op_id in seen:
                new_id = f"{op_id}{method.capitalize()}"
                op["operationId"] = new_id
                fixed += 1
            else:
                seen[op_id] = 1

    if fixed:
        print(f"  ✅ 重复 operationId 修复完成 ({fixed} 个)")


def write_spec(spec: dict) -> None:
    SPEC_OUT.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  ✅ spec → {SPEC_OUT}")


def run_orval() -> None:
    config_file = ADMIN_ROOT / "orval.config.ts"
    if not config_file.exists():
        print(f"  ❌ 缺少 {config_file}")
        print("     请确认 frontend/admin/orval.config.ts 存在")
        sys.exit(1)

    print(f"\n  📦 Admin ({ADMIN_ROOT})")
    result = subprocess.run(
        ["pnpm", "orval", "--config", "orval.config.ts"],
        cwd=ADMIN_ROOT,
        check=False,
    )
    if result.returncode != 0:
        print("  ❌ SDK 生成失败")
        sys.exit(result.returncode)
    print("  ✅ SDK 生成成功")


def write_sdk_barrel() -> None:
    """在 src/lib/sdk/ 下写出 index.ts 统一 re-export 所有 tag 文件。

    orval mode=tags 不生成 barrel，这里自动扫描生成好的文件并创建。
    ``make gen-sdk`` 每次都会重建，无需手动维护。
    """
    sdk_dir = ADMIN_ROOT / "src" / "lib" / "sdk"
    tag_files = sorted(
        f.stem for f in sdk_dir.iterdir()
        if f.suffix == ".ts" and f.stem not in ("index", "sdk.schemas")
    )

    lines = [
        "// SDK barrel — 由 orval 生成，勿手动编辑",
        "// 各 tag 文件由 make gen-sdk 自动重建",
        "export * from './sdk.schemas'",
    ]
    for stem in tag_files:
        lines.append(f"export * from './{stem}'")

    barrel = sdk_dir / "index.ts"
    barrel.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  ✅ barrel → {barrel} ({len(tag_files)} tag files)")


def cleanup_spec() -> None:
    if SPEC_OUT.exists():
        SPEC_OUT.unlink()
        print(f"  ✅ 已删除临时 spec {SPEC_OUT}")


def main() -> None:
    print("=" * 60)
    print("OwlApi SDK 生成工具 (orval)")
    print("=" * 60)

    print("\n📥 读取 + 处理 swagger.json...")
    spec = load_swagger()
    spec = strip_go_package_prefix(spec)
    unwrap_envelope_schemas(spec)
    fix_duplicate_operation_ids(spec)
    write_spec(spec)

    try:
        print("\n🔨 生成 SDK (orval)...")
        run_orval()
    finally:
        print("\n🧹 清理临时 spec...")
        cleanup_spec()

    print("\n📦 生成 SDK barrel (index.ts)...")
    write_sdk_barrel()

    print("\n" + "=" * 60)
    print("✅ SDK 生成完成！")
    print("=" * 60)
    print("\n📁 产物: frontend/admin/src/lib/sdk/")
    print("\n💡 在前端中使用示例:")
    print("   import { useListDataSources } from '@/lib/sdk/datasource'")
    print("   const { data } = useListDataSources(slug)  // TanStack Query hook")


if __name__ == "__main__":
    main()
