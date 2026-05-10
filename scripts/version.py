#!/usr/bin/env python3
import os
import re
import sys
import json


def update_file(file_path, pattern, replacement):
    if not os.path.exists(file_path):
        return False

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = re.sub(pattern, replacement, content)

    if content == new_content:
        return False

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True


def get_current_version():
    pkg_path = 'frontend/admin/package.json'
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path, 'r', encoding='utf-8') as f:
                return json.load(f).get('version', 'unknown')
        except Exception:
            pass
    return 'unknown'


def set_version(version):
    v_tag = f"v{version}" if not version.startswith('v') else version
    v_num = version.lstrip('v')

    print(f"🚀 Aligning project version to {v_num} (Docker tag: {v_tag})")

    # 1. frontend package.json
    for pkg_path in [
        'frontend/admin/package.json',
        'frontend/website/package.json',
        'frontend/docs/package.json',
    ]:
        if not os.path.exists(pkg_path):
            continue
        try:
            with open(pkg_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if data.get('version') == v_num:
                continue
            data['version'] = v_num
            with open(pkg_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write('\n')
            print(f"✅ Updated: {pkg_path}")
        except Exception as e:
            print(f"❌ Error updating {pkg_path}: {e}")

    # 2. backend/cmd/server/main.go — Swagger @version
    if update_file(
        'backend/cmd/server/main.go',
        r'// @version\s+[\d.]+',
        f'// @version         {v_num}',
    ):
        print("✅ Updated: backend/cmd/server/main.go (@version)")

    # 3. backend/internal/gateway/app.go — gateway register version
    if update_file(
        'backend/internal/gateway/app.go',
        r'Version:\s+"v[\d.]+"',
        f'Version:      "{v_tag}"',
    ):
        print("✅ Updated: backend/internal/gateway/app.go (Version)")

    # 4. docker-compose image tags
    for compose_path in [
        'deploy/docker-compose.yml',
        'deploy/docker-compose.static.yml',
        'deploy/docker-compose.gateway.yml',
    ]:
        # a. :latest or :vX.Y.Z → ${DOCKER_IMAGE_TAG:-vX.Y.Z}
        changed_a = update_file(
            compose_path,
            r'(image: .*?owlapi.*?):(?:latest|v[\d.]+)',
            fr'\1:${{DOCKER_IMAGE_TAG:-{v_tag}}}',
        )
        # b. already variable form — update fallback value
        changed_b = update_file(
            compose_path,
            r'(\$\{DOCKER_IMAGE_TAG:-)[^}]+\}',
            fr'\1{v_tag}}}',
        )
        if changed_a or changed_b:
            print(f"✅ Updated: {compose_path} (image tags → {v_tag})")

    # 5. Makefile help example
    if update_file(
        'Makefile',
        r'make set-version v=[\d.]+',
        f'make set-version v={v_num}',
    ):
        print("✅ Updated: Makefile (help example)")

    print(f"\n✅ Done. Version is now {v_num}")
    print("   Run 'make gen-swagger' to regenerate backend/docs/docs.go")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Current version: {get_current_version()}")
        print("Usage: make set-version v=<version>")
        sys.exit(0)
    set_version(sys.argv[1])
