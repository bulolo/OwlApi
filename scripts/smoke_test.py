#!/usr/bin/env python3
"""OwlApi 冒烟测试 — 对运行中的 dev 全栈做端到端健康验证。

覆盖：健康检查 → 平台管理(超管登录/租户列表/临时租户增删) →
      租户业务(管理员登录/项目·环境·分组·脚本·数据源·接口读取) →
      SQL→API 执行(经网关跑通一个已上线接口)。

前置条件：先把开发全栈跑起来并完成种子初始化
    make dev-rebuild        # 或 make dev-up（前台）
依赖：仅用 Python 标准库，无需 pip 安装。

用法：
    make smoke-test                      # 默认 http://localhost:3000
    make smoke-test base=http://host:3000
    make smoke-test c=0                  # 保留创建的测试租户(不清理)

    # 也可直接运行：
    python3 scripts/smoke_test.py --base-url http://localhost:3000 [--no-cleanup]
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

# ==================== 配置（与 backend/cmd/init 种子保持一致） ====================

DEFAULT_BASE = "http://localhost:3000"
SUPERADMIN = ("superadmin@owlapi.cn", "superadmin123")  # users.is_superadmin = true
TENANT_ADMIN = ("admin@owlapi.cn", "admin123")          # tenant=default 的 admin
SEED_TENANT = "default"
SEED_PROJECT = "ecommerce"


# ==================== 运行器 ====================


class SmokeTest:
    def __init__(self, base_url: str, cleanup: bool = True):
        self.base = base_url.rstrip("/")
        self.do_cleanup = cleanup
        self.token: str | None = None
        self.passed = 0
        self.failed = 0
        # (method, path, label) —— 倒序删除
        self._cleanup_stack: list[tuple[str, str, str]] = []

    # ---- HTTP ----

    def request(self, method: str, path: str, body=None, auth: bool = True, raw: bool = False):
        url = self.base + path
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"}
        if auth and self.token:
            headers["Authorization"] = "Bearer " + self.token
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                text = resp.read().decode()
                status = resp.status
        except urllib.error.HTTPError as e:
            text = e.read().decode()
            status = e.code
        except urllib.error.URLError as e:
            raise AssertionError(
                f"无法连接 {url}（{e.reason}）。先执行 make dev-rebuild 把全栈跑起来？"
            ) from None

        if raw:
            return status, text

        payload = json.loads(text) if text else {}
        # OwlApi R 信封：{ code, msg, data }，code=0 为成功
        if status >= 400 or (isinstance(payload, dict) and payload.get("code") not in (0, None)):
            raise AssertionError(f"{method} {path} → {status}: {text[:200]}")
        return payload.get("data") if isinstance(payload, dict) else payload

    @staticmethod
    def as_list(data) -> list:
        # 分页接口返回 {list, pagination}，非分页接口直接返回数组；空集合可能是 null。
        if isinstance(data, dict) and "list" in data:
            return data.get("list") or []
        return data or []

    def login(self, email: str, password: str) -> dict:
        data = self.request("POST", "/v1/auth/login", {"email": email, "password": password}, auth=False)
        self.token = data["token"]
        return data

    # ---- 断言/步骤 ----

    def step(self, name: str, fn):
        try:
            result = fn()
            print(f"  ✅ {name}")
            self.passed += 1
            return result
        except Exception as e:  # noqa: BLE001 — 冒烟测试要把任何异常记成失败
            print(f"  ❌ {name}: {e}")
            self.failed += 1
            return None

    def check(self, name: str, ok: bool, detail: str = ""):
        if ok:
            print(f"  ✅ {name}")
            self.passed += 1
        else:
            print(f"  ❌ {name}{(': ' + detail) if detail else ''}")
            self.failed += 1

    # ---- 清理 ----

    def cleanup(self):
        if not self._cleanup_stack:
            return
        if not self.do_cleanup:
            print("\n📋 跳过清理 (c=0)，残留测试数据：")
            for _, path, label in self._cleanup_stack:
                print(f"   - {label} ({path})")
            return
        print("\n📋 清理测试数据")
        self.step("超管登录(清理)", lambda: self.login(*SUPERADMIN))
        for method, path, label in reversed(self._cleanup_stack):
            self.step(f"删除{label}", lambda m=method, p=path: self.request(m, p))

    # ---- 主流程 ----

    def run(self) -> bool:
        print(f"\n🦉 OwlApi 冒烟测试 → {self.base}")
        print("=" * 56)
        try:
            self._run_tests()
        except KeyboardInterrupt:
            print("\n\n⚠️  测试中断，执行清理…")
        finally:
            self.cleanup()

        print("\n" + "=" * 56)
        total = self.passed + self.failed
        if self.failed:
            print(f"📊 结果：{self.passed}/{total} 通过，{self.failed} 失败 ❌")
        else:
            print(f"📊 结果：{self.passed}/{total} 通过 ✅")
        print()
        return self.failed == 0

    def _run_tests(self):
        ts = int(time.time())

        # 1) 健康检查
        print("\n📋 健康检查")
        status, _ = self.step("GET /health", lambda: self.request("GET", "/health", auth=False, raw=True)) or (0, "")
        self.check("/health 返回 200", status == 200, f"status={status}")

        # 2) 平台管理（超级管理员）
        print("\n📋 平台管理（超级管理员）")
        if self.step("超管登录", lambda: self.login(*SUPERADMIN)) is None:
            print("\n💀 超管登录失败，跳过平台测试")
        else:
            self.step("列出全部租户", lambda: self.request("GET", "/v1/tenants"))
            slug = f"smoke-{ts}"

            def create_tenant():
                t = self.request("POST", "/v1/tenants", {"name": "冒烟测试租户", "slug": slug, "plan": "free"})
                # 入栈：稍后倒序清理（验证无外键级联删除）
                self._cleanup_stack.append(("DELETE", f"/v1/tenants/{slug}", f"租户 {slug}"))
                return t

            if self.step("创建临时租户", create_tenant) is not None:
                self.step("读取临时租户", lambda: self.request("GET", f"/v1/tenants/{slug}"))

        # 3) 租户业务（租户管理员 + 种子数据）
        print("\n📋 租户业务（租户管理员 / 种子数据）")
        if self.step("租户管理员登录", lambda: self.login(*TENANT_ADMIN)) is None:
            print("\n💀 租户管理员登录失败，跳过业务测试")
            return

        self.step("我的租户列表", lambda: self.request("GET", "/v1/my/tenants"))
        projects = self.as_list(self.step(
            f"列出项目（{SEED_TENANT}）",
            lambda: self.request("GET", f"/v1/tenants/{SEED_TENANT}/projects"),
        ))
        proj = next((p for p in projects if p.get("slug") == SEED_PROJECT), None)
        self.check(f"存在种子项目 {SEED_PROJECT}", proj is not None)
        if not proj:
            return
        pid = proj["id"]
        base = f"/v1/tenants/{SEED_TENANT}/projects/{pid}"

        self.step("项目环境", lambda: self.request("GET", f"{base}/environments"))
        self.step("项目分组", lambda: self.request("GET", f"{base}/groups"))
        self.step("租户脚本库", lambda: self.request("GET", f"/v1/tenants/{SEED_TENANT}/scripts"))
        self.step("数据源", lambda: self.request("GET", f"/v1/tenants/{SEED_TENANT}/datasources"))
        endpoints = self.as_list(self.step("接口列表", lambda: self.request("GET", f"{base}/endpoints")))
        self.check("种子项目至少有 1 个接口", len(endpoints) > 0)

        # 4) SQL→API 执行（核心：经网关跑通一个已上线接口）
        print("\n📋 SQL→API 执行（网关）")
        target = None
        for ep in endpoints:
            actives = self.as_list(self.request("GET", f"{base}/endpoints/{ep['id']}/actives"))
            if actives:
                target = (ep, actives[0]["env_id"])
                break
        if not target:
            self.check("存在已上线接口可执行", False, "没有任何接口在任何环境上线")
            return
        ep, env_id = target

        def run_endpoint():
            data = self.request(
                "POST",
                f"{base}/run",
                {"endpoint_id": ep["id"], "env_id": env_id, "params": {}},
            )
            assert data is not None, "执行返回空"
            return data

        self.step(f"执行 {ep.get('method')} {ep.get('path')}（env_id={env_id}）", run_endpoint)


def main():
    ap = argparse.ArgumentParser(description="OwlApi 冒烟测试")
    ap.add_argument("--base-url", default=DEFAULT_BASE, help=f"后端地址（默认 {DEFAULT_BASE}）")
    ap.add_argument("--no-cleanup", action="store_true", help="保留创建的测试数据")
    args = ap.parse_args()

    ok = SmokeTest(args.base_url, cleanup=not args.no_cleanup).run()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
