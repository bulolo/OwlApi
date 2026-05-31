# OpenAPI 与客户端 SDK

OwlApi 围绕 OpenAPI 规范提供三类能力：

1. **在线文档** —— 在管理后台直接预览 Swagger UI，支持生成永久分享链接给同事
2. **导出 OpenAPI** —— 下载该环境的 OpenAPI 3.0 JSON，导入 Postman / Apifox 等工具
3. **客户端 SDK** —— 生成强类型客户端代码，有「下载 ZIP」和「发布到 GitLab CI 自动化」两种模式

::: warning 企业版功能
以上三项均属企业版 (EE) 功能。社区版界面可见但禁用（带 `EE` 标记）。
:::

## 操作入口

进入任意项目 → 右上角工具栏：

- **「在线文档 ∨」** 分裂按钮：
  - 左侧点击 → 在弹窗内打开当前项目的 Swagger UI
  - 右侧 `∨` → 下拉选择环境，下载该环境的 OpenAPI JSON
- **「客户端 SDK」** 按钮 → 打开三 tab 弹窗（下载 ZIP / 发布到 GitLab / 配置）

---

## 在线 API 文档

点击「在线文档」后弹出全屏 Swagger UI 窗口，默认展示第一个环境的已发版接口。

### 切换环境

弹窗顶部有环境 tab，点击即切换，Swagger UI 自动重新加载对应 spec。

### 生成分享链接

点击顶部「分享」按钮，系统生成一条**永久公开链接**并自动复制到剪贴板。

链接格式：`https://<admin-domain>/share/<token>`

- **无需登录**即可访问，适合分享给不在 OwlApi 账号体系内的同事或外部对接方
- 每个项目 + 环境组合最多保留**一条**链接；再次点击「分享」返回同一条链接
- 链接永久有效，不会自动过期

分享成功后，按钮区域变为绿色「分享中」状态，提供两个操作：

| 图标 | 说明 |
| :--- | :--- |
| 复制图标 | 再次复制链接到剪贴板 |
| 垃圾桶图标 | **撤销分享** —— 删除 token，已发出的链接立即失效 |

::: tip
Swagger UI 资源文件由 OwlApi 本地服务，不依赖外部 CDN，内网部署可正常使用。
:::

---

## 导出 OpenAPI 规范

点击「在线文档」按钮右侧的 `∨`，选择环境即可下载 `openapi-{环境名}.json`。

规范按**环境**生成，仅包含该环境**已发版**的接口，草稿状态不会出现。下载的文件可直接导入 Postman、Apifox、Insomnia，或上传至任何兼容 OpenAPI 3.0 的工具。

::: tip
Swagger UI 在线文档与导出 JSON 的数据来源一致，都是该环境的实时发版状态。
:::

---

## 客户端 SDK

点击「客户端 SDK」按钮，弹窗包含三个 tab。

### 下载 ZIP（本地集成）

选择环境 + 语言 → 「生成并下载」，拿到 ZIP 后自行集成到项目。

**支持的语言：**

| 语言 | HTTP 库 |
| :--- | :--- |
| TypeScript | Fetch / Axios |
| JavaScript | ES6 |
| Python | requests |
| Go | net/http |
| Java | OkHttp |
| PHP | Guzzle |
| Swift | URLSession |

**TypeScript Fetch SDK 使用示例：**

```bash
unzip sdk-prod-typescript-fetch.zip -d ./sdk
cp -r ./sdk/apis ./sdk/models ./sdk/runtime.ts ./sdk/index.ts ./src/api/
```

```typescript
import { Configuration, DefaultApi } from "./api"

const api = new DefaultApi(
  new Configuration({
    basePath: "https://your-gateway-host",
    apiKey: "sk-xxxxxxxxxxxxxxxx",   // 项目启用 API Key 鉴权时填写
  })
)

const result = await api.getUsers({ page: 1, size: 20 })
```

::: warning 路径占位符
生成的 SDK 路径含 `{tenantSlug}` 和 `{projectSlug}`，集成后需全局搜索替换为实际值。
:::

### 发布到 GitLab（CI 自动化）

适合**多人共享同一份 SDK、需要版本管理、消费方希望 `npm install` 直接拿到最新版**的场景。

OwlApi 会：

1. 在 GitLab 自动建一个以 `npm 包名` 命名的 SDK 仓库
2. 把生成的代码推到对应 env 的分支并打 tag
3. 触发 GitLab CI，CI 跑 `npm publish` / `twine upload` 把包发到 GitLab Package Registry

#### 一次性配置

进入 **客户端 SDK → 配置** tab：

| 字段 | 说明 |
| :--- | :--- |
| **GitLab 地址** | 例如 `https://gitlab.com` 或自部署地址 |
| **Group ID** | 自动建仓的父 group（GitLab group 主页右上「...」可查看 ID） |
| **Access Token** | Personal Access Token，scope=`api`，加密落库，前端不回显 |
| **npm scope** | 例如 `@acme`，**必须与 GitLab group path 一致** |
| **npm 包名** | 例如 `ecommerce-sdk`，GitLab 仓库名与此相同 |
| **PyPI 包名** | Python 包名（snake_case） |
| **Runner Tags** | GitLab CI runner 的 tag，注入到 `.gitlab-ci.yml`；留空则任意 runner 均可领取 |
| **启用语言** | 至少选一个 |

点 **保存** 后：

- 若 GitLab 仓库尚未创建，OwlApi 自动调 GitLab API 建仓并推入 `.gitlab-ci.yml` 模板
- 建仓成功后，配置区显示回填的 GitLab 项目 ID 和仓库地址

::: tip Token 处理
- 首次保存必须填写 Token
- 后续更新时留空 Token 字段 = 保留旧 Token，不会误覆盖
- Token 在数据库内使用 AES-256-GCM 加密，KEK 派生自 JWT_SECRET
:::

::: warning 修改 Runner Tags 后
更新 Runner Tags 仅同步数据库，**已推入 GitLab 的 `.gitlab-ci.yml` 不会自动更新**。
如需让新 Tags 生效，点击「重新建仓」让 OwlApi 重新推一份 CI 文件，或直接在 GitLab 上手动编辑。
:::

**重新建仓：** 配置区底部的「重新建仓」按钮会重置 GitLab 项目绑定，下次保存时重新创建仓库并推入最新 `.gitlab-ci.yml`（原有仓库内容不受影响）。

#### 多环境发版策略

OwlApi 用**同包名 + npm dist-tag** 区分环境：

| 环境 | GitLab 分支 | git tag | 包版本 | npm dist-tag |
| :--- | :--- | :--- | :--- | :--- |
| `prod` | `main` | `v1.0.0` | `1.0.0` | `latest` |
| `dev` | `dev` | `dev-v1.0.0-dev.42` | `1.0.0-dev.42` | `dev` |
| `staging` | `staging` | `staging-v1.0.0-staging.43` | `1.0.0-staging.43` | `staging` |

非 prod 环境版本号附加 `-<env>.<runID>` 后缀，保证唯一且可追溯。

#### 发版操作

进入 **客户端 SDK → 发布到 GitLab** tab：

1. 选环境
2. 选语言（仅显示「配置」中已启用的语言）
3. 输入版本号
4. 点「发布到 GitLab」

后端同步执行：拉 spec → 调 sidecar 生成代码 → push 到 GitLab → 打 tag。整个流程约 30 秒。

**发版历史**显示在按钮下方（最近 5 次），状态流转：

`排队中 → 生成代码 → 推送 GitLab → CI 发版中 → 已发布 / 失败`

失败记录会显示可展开的红色错误详情。

#### 消费方使用

**配置 registry（自部署 GitLab）：**

```ini
# ~/.npmrc
@acme:registry=https://gitlab.acme.com/api/v4/packages/npm/
//gitlab.acme.com/api/v4/packages/npm/:_authToken=${GITLAB_TOKEN}
```

**安装：**

```bash
# 生产环境 → latest
npm install @acme/ecommerce-sdk

# 开发 / 联调 → dev 最新
npm install @acme/ecommerce-sdk@dev

# 锁定特定 dev 版本
npm install @acme/ecommerce-sdk@1.0.0-dev.42
```

`@dev` dist-tag 始终指向最新一次 dev 发版，`@latest` 同理。

**Python：**

```bash
pip install ecommerce-sdk               # 稳定版
pip install ecommerce-sdk==1.0.0.dev42  # 指定 dev 版本
```

#### GitLab CI 模板

OwlApi 建仓时自动推入 `.gitlab-ci.yml`，逻辑：

```yaml
publish-npm:
  rules: [{ if: $CI_COMMIT_TAG }]
  # Runner Tags 由配置注入（若有）
  script:
    - cd typescript-axios
    - npm install --no-audit && npm run build && npm publish --tag "$NPM_TAG"
```

CI 使用 `$CI_JOB_TOKEN` 发版，OwlApi 后端不持有 Package Registry 凭据。

---

## 部署要求

「发布到 GitLab」依赖独立 sidecar `owlapi-sdk-builder`（封装 `openapi-generator-cli`）：

- **开发环境**：`make dev-up ee=1` 会一并启动 sidecar
- **生产环境**：`docker compose --profile ee up sdkbuilder`，通过 `OWLAPI_SDK_BUILDER_URL` 让 backend 找到它

「下载 ZIP」调用公网 `api.openapi-generator.tech`，不依赖 sidecar。

---

## 常见问题

**Q：分享链接发出去后想停止访问怎么办？**

在「在线文档」弹窗顶部点击垃圾桶图标「撤销分享」，原链接立即返回 404。

**Q：为什么工具栏按钮带 `EE` 标记且不能点？**

在线文档、导出 OpenAPI、客户端 SDK 均属企业版功能，社区版保留可见性但禁用。

**Q：发版失败 "A file with this name already exists"？**

OwlApi 已处理该场景，如仍报此错请提 issue 附 run ID + GitLab 项目 ID。

**Q：`npm publish` 时 401？**

`npm scope` 必须严格对应 GitLab group path（group 是 `acme` → scope 必须 `@acme`），instance-level Package Registry 解析依赖此一致性。

**Q：修改了 Runner Tags 但 CI 还是走旧 runner？**

配置中修改 Runner Tags 只更新数据库，已有的 `.gitlab-ci.yml` 不会自动变。点「重新建仓」或手动编辑 GitLab 仓库中的 CI 文件。

**Q：方法名如何对应接口路径？**

规则 `{HTTP方法}{路径片段}`：

| 接口 | 生成方法 |
| :--- | :--- |
| `GET /users` | `getUsers({ page?, size? })` |
| `GET /users/{id}` | `getUsersById({ id })` |
| `POST /orders` | `postOrders({ postOrdersRequest })` |
| `DELETE /products/{id}` | `deleteProductsById({ id })` |
