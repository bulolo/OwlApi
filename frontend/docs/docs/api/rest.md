# REST API

Control Plane 对外暴露的 HTTP API，基于 Gin 框架，默认监听 `:3000`。

Swagger UI：启动服务后访问 http://localhost:3000/swagger/index.html

> 本文档以实际代码路由（`internal/transport/http/router.go`）为准。所有管理类接口前缀为 `/v1`，公开的网关调用走 `/-/` 前缀，二者命名空间互不冲突。

## 认证

除「公开」标记的接口外，所有 `/v1` 接口需要 JWT 认证：

```
Authorization: Bearer <token>
```

### 权限级别

| 级别 | 说明 |
| :--- | :--- |
| 公开 | 无需认证 |
| 已登录 | 仅需有效 JWT，不校验租户角色 |
| Viewer+ | 租户成员（Viewer / Admin），只读类 |
| Admin+ | 租户管理员，写操作；**受 Demo 模式保护**（演示环境下会被拒绝） |
| SuperAdmin | 平台超级管理员 |

---

## 统一响应格式

所有 `/v1` 接口均返回以下结构：

```json
{ "code": 0, "msg": "success", "data": { ... } }
```

**分页响应**（`data` 内为分页结构）：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "list": [...],
    "pagination": { "is_pager": 1, "page": 1, "size": 10, "total": 100 }
  }
}
```

**错误响应**（`data` 字段省略）：

```json
{ "code": 1, "msg": "error description" }
```

### 分页查询参数

支持分页的列表接口接受以下查询参数：

| 参数 | 类型 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `page` | int | 页码 | `1` |
| `size` | int | 每页条数（有效范围 1–100，超出回退为 `10`） | `10` |
| `is_pager` | int | `0` = 返回全部（忽略分页）；`1` = 分页 | `1` |
| `keyword` | string | 关键词搜索 | — |

### HTTP 状态码

| 状态码 | 含义 |
| :--- | :--- |
| 200 | 成功（业务错误也在 200 中通过 `code` 区分） |
| 400 | 请求参数错误 |
| 401 | 未认证或 token 无效/过期 |
| 403 | 权限不足 / Demo 模式禁止写操作 |
| 404 | 资源不存在 |
| 409 | 资源冲突（邮箱已注册、slug 已存在等） |
| 503 | 网关未连接 |
| 500 | 服务器内部错误 |

---

## 认证

### 注册（公开）

```
POST /v1/auth/register
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 邮箱 |
| `name` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |
| `tenant_name` | string | 否 | 同时创建租户 |
| `tenant_slug` | string | 否 | 租户 slug（与 `tenant_name` 配合使用） |

::: warning
若平台设置 `allow_self_register = false`，注册接口返回 403。
:::

**响应 data：**

```json
{
  "user": { "id": 1, "email": "...", "name": "...", "is_superadmin": false },
  "token": "<jwt>",
  "tenant": { "id": 1, "name": "...", "slug": "..." }
}
```

### 登录（公开）

```
POST /v1/auth/login
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 邮箱 |
| `password` | string | 是 | 密码 |

**响应 data：**

```json
{
  "user": { "id": 1, "email": "...", "name": "...", "is_superadmin": false },
  "token": "<jwt>",
  "tenants": [{ "id": 1, "name": "...", "slug": "..." }]
}
```

### 修改密码（已登录）

```
PUT /v1/auth/change-password
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `old_password` | string | 是 | 当前密码 |
| `new_password` | string | 是 | 新密码（至少 6 位） |

---

## 平台设置

### 获取（公开）

```
GET /v1/platform/settings
```

### 更新（SuperAdmin · 企业版）

```
PUT /v1/platform/settings
```

**请求体 / 响应 data：**

```json
{ "allow_self_register": true }
```

::: tip 企业版（EE）
**平台管理类**接口——平台设置写入、平台脚本管理、跨租户管理（列表/创建/更新/删除）、租户 EE 配置——均为 EE 功能：仅 license 生效时注册，CE / 未授权访问返回 404。
公开的 `GET /v1/platform/settings`、`GET /v1/my/tenants`、`GET /v1/tenants/:slug` 仍在核心。
:::

---

## 平台脚本（SuperAdmin · 企业版）

平台级内置脚本，所有租户共享，可被租户「从内置复制」到自己的脚本库。

```
GET    /v1/platform/scripts
POST   /v1/platform/scripts
PUT    /v1/platform/scripts/:scriptId
DELETE /v1/platform/scripts/:scriptId
```

请求体同[脚本管理](#脚本管理)的创建/更新（`name` / `type` / `code` / `description`）。

---

## 租户管理

### 我的租户列表（已登录）

```
GET /v1/my/tenants
```

SuperAdmin 返回所有租户；普通用户返回已加入的租户。支持分页参数。

### 列表（SuperAdmin · 企业版）

```
GET /v1/tenants
```

### 创建（SuperAdmin · 企业版）

```
POST /v1/tenants
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 租户名称 |
| `slug` | string | 是 | 唯一标识，用于 URL |
| `plan` | string | 否 | 订阅档位 `Free` / `Pro` / `Enterprise` / `Demo`；实际写入 EE 配置表 |

> `plan` 属订阅(EE)概念，已从核心 `tenants` 下移到 `tenant_ee_configs`（见下方「租户 EE 配置」）。详情 `GET /v1/tenants/:slug` 返回的 `is_demo` 即由 `plan==Demo` 计算。

### 详情（Viewer+）

```
GET /v1/tenants/:slug
```

响应含计算字段 `is_demo`（EE 下基于 `tenant_ee_configs.plan==Demo`；CE 恒 `false`）。

### 更新（SuperAdmin · 企业版）

```
PUT /v1/tenants/:slug
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `name` | string | 租户名称 |
| `status` | string | `Active` / `Suspended`（基础生命周期，留在核心） |

> `plan` 不再经此接口，改走「租户 EE 配置」。

### 删除（SuperAdmin · 企业版）

```
DELETE /v1/tenants/:slug
```

### 租户 EE 配置（SuperAdmin · 企业版）

```
GET /v1/tenants/:slug/ee-config
PUT /v1/tenants/:slug/ee-config
```

租户级订阅与配额(1:1 `tenant_ee_configs`)。`PUT` 为全量 upsert。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `plan` | string | `Free` / `Pro` / `Enterprise` / `Demo`（默认 `Free`） |
| `max_projects` / `max_endpoints` / `max_datasources` / `max_gateways` | int | 资源配额（`0` = 不限制） |
| `plan_expires_at` | string | 订阅到期（RFC3339） |
| `contact_email` / `contact_phone` | string | 商务联系 |
| `advanced_config` | object | 高级配置 JSON（SSO / IP 白名单 / feature flags…） |

### 更新租户配置（Admin+）

```
PUT /v1/tenants/:slug/settings
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `max_release_versions` | int | 每个接口保留的最大历史版本数 |

---

## 用户管理

```
GET    /v1/tenants/:slug/users               # 列表（Viewer+），支持分页
POST   /v1/tenants/:slug/users               # 添加成员（Admin+）
PUT    /v1/tenants/:slug/users/:userId/role  # 修改角色（Admin+）
DELETE /v1/tenants/:slug/users/:userId       # 移除成员（Admin+）
```

**添加成员请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 邮箱 |
| `name` | string | 是 | 用户名 |
| `password` | string | 是 | 初始密码 |
| `role` | string | 是 | `Admin` 或 `Viewer` |

**修改角色请求体：** `{ "role": "Admin" }`

---

## 网关管理

```
GET    /v1/tenants/:slug/gateways              # 列表（Viewer+），支持分页
GET    /v1/tenants/:slug/gateways/:gatewayId   # 详情（Viewer+）
POST   /v1/tenants/:slug/gateways              # 创建（Admin+）
DELETE /v1/tenants/:slug/gateways/:gatewayId   # 删除（Admin+）
```

**创建请求体：** `{ "name": "IDC-Primary" }`

**创建响应 data：**

```json
{ "id": 1, "name": "IDC-Primary", "token": "gw_xxx...", "status": "offline", "is_platform": false }
```

::: warning
`token` 仅在创建时返回完整值，请妥善保存。后续查询不再返回 token 明文。
:::

---

## 数据源管理

::: tip
响应中的 DSN 密码部分会被自动脱敏（替换为 `***`）。
:::

```
GET    /v1/tenants/:slug/datasources                 # 列表（Viewer+），支持分页
GET    /v1/tenants/:slug/datasources/:datasourceId   # 详情（Viewer+）
POST   /v1/tenants/:slug/datasources                 # 创建（Admin+）
PUT    /v1/tenants/:slug/datasources/:datasourceId   # 更新（Admin+）
DELETE /v1/tenants/:slug/datasources/:datasourceId   # 删除（Admin+）
POST   /v1/tenants/:slug/datasources/test            # 测试连通性（Admin+）
```

**创建请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 数据源名称 |
| `type` | string | 是 | `mysql` / `postgres` / `sqlserver` / `starrocks` / `doris` / `sqlite` |
| `is_dual` | bool | 否 | 是否配置双环境（prod + dev） |
| `envs` | array | 是（至少 1 个） | 环境配置列表 |

**`envs` 子项：** `env`（`prod` / `dev`）、`dsn`（连接串）、`gateway_id`（执行查询的网关 ID）。

```json
{
  "name": "主数据库",
  "type": "mysql",
  "is_dual": false,
  "envs": [{ "env": "prod", "dsn": "user:pass@tcp(host:3306)/db", "gateway_id": 1 }]
}
```

更新字段同创建，均可选；若提供 `envs` 则全量替换原有环境配置。

**测试连通性请求体：** `{ "dsn": "user:pass@tcp(host:3306)/db", "gateway_id": 1 }` → 响应 `{ "latency_ms": 12 }`

---

## 项目管理

```
GET    /v1/tenants/:slug/projects               # 列表（Viewer+），支持分页
GET    /v1/tenants/:slug/projects/:projectId    # 详情（Viewer+）
POST   /v1/tenants/:slug/projects               # 创建（Admin+）
PUT    /v1/tenants/:slug/projects/:projectId    # 更新（Admin+）
DELETE /v1/tenants/:slug/projects/:projectId    # 删除（Admin+）
```

**创建请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `slug` | string | 是 | 项目标识，用于 API 路由路径 |
| `name` | string | 是 | 项目名称 |
| `description` | string | 否 | 项目描述 |
| `avatar` | string | 否 | 项目图标 |
| `env` | string | 否 | 初始默认环境名 |
| `datasource_id` | int64 | 否 | 初始环境默认绑定的数据源 |

更新请求体：`slug` / `name` / `description` / `avatar`，均可选。

### 导出 OpenAPI 规范（Viewer+）

```
GET /v1/tenants/:slug/projects/:projectId/openapi.json
```

导出项目所有接口的 **OpenAPI 3.0.3** 规范（JSON），可直接导入 Apifox、Postman。响应带 `Content-Disposition: attachment` 触发下载。

### OpenAPI 分享链接

```
GET    /v1/tenants/:slug/projects/:projectId/openapi-share   # 获取当前分享 token（Viewer+）
POST   /v1/tenants/:slug/projects/:projectId/openapi-share   # 创建/重置分享 token（Viewer+）
DELETE /v1/tenants/:slug/projects/:projectId/openapi-share   # 撤销分享 token（Viewer+）
```

创建后可通过[公开 OpenAPI 分享](#公开-openapi-分享)无认证访问该规范。

### 项目鉴权配置

```
GET    /v1/tenants/:slug/projects/:projectId/auth              # 查看鉴权配置（Viewer+）
PUT    /v1/tenants/:slug/projects/:projectId/auth              # 更新鉴权方式（Admin+）
POST   /v1/tenants/:slug/projects/:projectId/auth/keys         # 创建 API Key（Admin+）
DELETE /v1/tenants/:slug/projects/:projectId/auth/keys/:keyId  # 删除 API Key（Admin+）
```

**更新鉴权方式请求体：** `{ "auth_type": "public" }`，取值 `public` / `api_key` / `jwt`。

**创建 API Key 请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `type` | string | 是 | `api_key` / `jwt` |
| `name` | string | 是 | 密钥名称 |
| `expires_at` | string | 否 | 过期时间（RFC3339），不传为永久 |

---

## 环境与绑定

每个项目可定义多个环境（如 `prod` / `dev`），接口里用「数据源别名」引用数据源，别名在不同环境下解析为不同物理数据源。

```
GET    /v1/tenants/:slug/projects/:projectId/environments                    # 环境列表（Viewer+）
POST   /v1/tenants/:slug/projects/:projectId/environments                    # 创建环境（Admin+）
PUT    /v1/tenants/:slug/projects/:projectId/environments/:envId             # 重命名环境（Admin+）
DELETE /v1/tenants/:slug/projects/:projectId/environments/:envId             # 删除环境（Admin+）
POST   /v1/tenants/:slug/projects/:projectId/environments/:envId/default     # 设为默认环境（Admin+）
GET    /v1/tenants/:slug/projects/:projectId/bindings                        # 项目所有别名绑定（Viewer+）
GET    /v1/tenants/:slug/projects/:projectId/environments/:envId/bindings    # 某环境的别名绑定（Viewer+）
POST   /v1/tenants/:slug/projects/:projectId/environments/:envId/bindings    # 新增/更新别名绑定（Admin+）
DELETE /v1/tenants/:slug/projects/:projectId/environments/:envId/bindings/:alias  # 删除别名绑定（Admin+）
POST   /v1/tenants/:slug/projects/:projectId/aliases/rename                  # 重命名别名（Admin+）
```

**创建环境请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 环境名 |
| `is_default` | bool | 否 | 是否设为默认 |
| `copy_from_env_id` | int64 | 否 | 从指定环境复制配置 |
| `copy_bindings` | bool | 否 | 是否一并复制别名绑定 |

**重命名环境：** `{ "name": "staging" }`

**别名绑定请求体：** `{ "alias": "main", "datasource_id": 1 }`

**重命名别名：** `{ "old_alias": "main", "new_alias": "primary" }`

---

## 接口分组

```
GET    /v1/tenants/:slug/projects/:projectId/groups            # 列表（Viewer+），支持分页
POST   /v1/tenants/:slug/projects/:projectId/groups            # 创建（Admin+）
PUT    /v1/tenants/:slug/projects/:projectId/groups/:groupId   # 更新（Admin+）
DELETE /v1/tenants/:slug/projects/:projectId/groups/:groupId   # 删除（Admin+）
```

**请求体：** `{ "name": "用户接口", "description": "..." }`

---

## 接口管理

```
GET    /v1/tenants/:slug/projects/:projectId/endpoints                # 列表（Viewer+），支持分页
POST   /v1/tenants/:slug/projects/:projectId/endpoints                # 创建（Admin+）
PUT    /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId    # 全量更新（Admin+）
PATCH  /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId    # 局部更新（Admin+，目前仅 group_id）
DELETE /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId    # 删除（Admin+）
```

列表除分页参数外，支持 `group_id`（int）按分组过滤，`0` 表示不过滤。

**创建 / 更新请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `path` | string | 是 | 接口路径，如 `/users/:id` |
| `method` | string | 是 | HTTP 方法，如 `GET` |
| `sql` | string | 是 | SQL 查询语句 |
| `summary` | string | 否 | 接口摘要 |
| `description` | string | 否 | 接口描述 |
| `datasource_alias` | string | 否 | 数据源别名（按 env 解析为具体数据源） |
| `group_id` | int64 | 否 | 分组 ID |
| `param_defs` | array | 否 | 参数定义，见下表 |
| `response_defs` | array | 否 | 响应字段定义（用于生成文档 / SDK 类型） |
| `pre_scripts` | array | 否 | 前置脚本链，按顺序执行 |
| `post_scripts` | array | 否 | 后置脚本链，data 顺序流过，包装脚本放链尾 |

**`param_defs` 子项：** `name`、`type`（`string` / `integer` / `number` / `boolean`）、`required`（bool）、`default`、`desc`。

**脚本链（`pre_scripts` / `post_scripts`）子项：**

```json
{ "source": "library", "script_id": 12 }                      // 引用库脚本
{ "source": "inline", "name": "参数校验", "code": "function main(params){...}" }  // 接口内联
```

**示例：**

```json
{
  "path": "/users/:id",
  "method": "GET",
  "sql": "SELECT * FROM users WHERE id = :id",
  "summary": "获取用户",
  "datasource_alias": "main",
  "param_defs": [{ "name": "id", "type": "integer", "required": true, "desc": "用户 ID" }]
}
```

更新成功后自动创建/更新草稿，不影响已发布版本。

**PATCH 局部更新请求体：** `{ "group_id": 3 }`（用于把接口移动到分组；`group_id` 为 `0` 表示移出分组）。

---

## 版本管理

接口采用「草稿 → 版本快照 → 各环境激活」模型。调用网关始终使用某环境当前激活的版本快照。

```
GET    .../endpoints/:endpointId/versions                       # 版本列表（Viewer+），支持分页
POST   .../endpoints/:endpointId/versions                       # 创建版本快照（Admin+）
GET    .../endpoints/:endpointId/actives                        # 各环境当前激活版本（Viewer+）
GET    .../endpoints/:endpointId/activation-log                 # 操作日志（Viewer+），支持分页
POST   .../endpoints/:endpointId/publish                        # 上线（Admin+）
POST   .../endpoints/:endpointId/versions/:versionId/activate   # 上线指定历史版本（Admin+）
DELETE .../endpoints/:endpointId/versions/:versionId            # 删除版本（Admin+）
POST   .../endpoints/:endpointId/unpublish                      # 下线（Admin+）
POST   .../endpoints/:endpointId/revert                         # 还原草稿到当前激活版本（Admin+）
POST   .../endpoints/:endpointId/promote                        # 跨环境晋升（Admin+）
```

（以上路径前缀均为 `/v1/tenants/:slug/projects/:projectId`。）

**上线 `publish`：** 创建新版本快照并在目标环境激活。请求体 `{ "note": "修复分页逻辑" }`；目标环境通过查询参数 `?env_id=<id>` 或 `?env=<name>` 指定。保留版本数受租户 `max_release_versions` 限制，超出自动删除最旧版本。

**创建版本 `versions`：** 仅拍快照、不激活。请求体 `{ "note": "..." }`。

**激活指定版本 `activate`：** 把已有版本在某环境上线（版本号回退即记为回滚）。目标环境同样用 `?env_id=` / `?env=` 指定。

**晋升 `promote`：** 把某环境已激活的版本原样推到另一环境（复用同一版本，不新建快照）。请求体：

```json
{ "source_env_id": 1, "target_env_id": 2 }
```

**下线 `unpublish`：** 取消某环境的激活，调用网关对该路径返回 404。环境用 `?env_id=` / `?env=` 指定。

**还原 `revert`：** 丢弃草稿改动，把草稿还原为当前激活版本的内容。

::: tip
所有上线/激活/晋升在接口操作日志中统一展示为「上线」，回滚/下线/还原对应各自措辞。
:::

---

## 调用日志（Viewer+）

```
GET /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId/call-logs
```

倒序返回指定接口最近的调用流水（成功 + 失败），支持分页。查询参数：

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `status` | string | 状态码段：`all` / `2xx` / `4xx` / `5xx` |
| `keyword` | string | 匹配 path 或 error |
| `since` | string | 时间下限（RFC3339），仅返回该时间之后 |
| `env_id` | int64 | 仅某环境 |

---

## 脚本管理

```
GET    /v1/tenants/:slug/scripts                              # 列表（Viewer+），支持分页
GET    /v1/tenants/:slug/scripts/builtins                     # 内置脚本列表（Viewer+）
POST   /v1/tenants/:slug/scripts                              # 创建（Admin+）
POST   /v1/tenants/:slug/scripts/builtins/:builtinId/copy     # 从内置脚本复制一份到本租户（Admin+）
PUT    /v1/tenants/:slug/scripts/:scriptId                    # 更新（Admin+）
DELETE /v1/tenants/:slug/scripts/:scriptId                    # 删除（Admin+）
```

**创建 / 更新请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 脚本名称 |
| `type` | string | 是 | `pre`（前置）或 `post`（后置） |
| `code` | string | 是 | JavaScript 代码 |
| `description` | string | 否 | 说明 |

前置脚本在 SQL 执行前运行，可修改参数 `params`；后置脚本在 SQL 执行后运行，可转换查询结果，并可定义 `schema()` 声明响应结构（用于生成文档与 SDK 类型）。脚本在接口上被编排成「前置链 / 后置链」按顺序执行——每步可引用库脚本或在接口内联（见接口的 `pre_scripts` / `post_scripts`）。

---

## 概览（Viewer+）

### 流量趋势

```
GET /v1/tenants/:slug/overview/traffic
```

| 查询参数 | 类型 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `range` | string | `24h`（按小时）/ `7d` / `30d`（按天） | `24h` |

按时间桶聚合当前租户的接口调用量（总数 + 错误数），空桶补零，返回连续序列。

**响应 data：**

```json
{
  "range": "24h", "bucket": "hour", "total": 1234, "errors": 21, "peak": 140,
  "buckets": [{ "ts": "2026-05-31T03:00:00Z", "total": 140, "errors": 5 }]
}
```

### 最近动态

```
GET /v1/tenants/:slug/overview/activity
```

| 查询参数 | 类型 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `limit` | int | 返回条数（最大 50） | `10` |

合并资产变更事件（接口上线/回滚/下线等）与流量异常（5xx、慢查询 > 1000ms），按时间倒序。

**响应 data：**

```json
{
  "list": [
    { "type": "api", "title": "用户列表", "desc": "Admin 上线 v2 版本（dev）", "severity": "info", "at": "2026-05-31T11:32:27+08:00" },
    { "type": "error", "title": "GET /api/orders", "desc": "返回 500：db connection refused", "severity": "error", "at": "..." }
  ]
}
```

`type`：`api` / `error` / `slow`；`severity`：`info` / `warning` / `error`。

---

## 调试工具（Viewer+）

以下接口用于开发阶段调试，不影响已发布接口。

### 设计器执行

```
POST /v1/tenants/:slug/projects/:projectId/run
```

执行某个**已保存**接口（含鉴权验证与脚本链），用于设计器联调。

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `endpoint_id` | int64 | 是 | 接口 ID |
| `env_id` | int64 | 否 | 目标环境，缺省用默认环境 |
| `params` | object | 否 | 查询参数 `{ "key": "value" }` |
| `auth_credential` | string | 否 | 当项目开启鉴权时用于验证的凭据 |
| `ignore_scripts` | bool | 否 | 是否跳过前置/后置脚本 |

### 直接执行 SQL

```
POST /v1/tenants/:slug/projects/:projectId/run-sql
```

不保存接口，直接跑一段 SQL，用于设计器调试。

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `sql` | string | 是 | SQL 语句 |
| `datasource_alias` | string | 是 | 数据源别名 |
| `env_id` | int64 | 否 | 目标环境 |
| `params` | object | 否 | 查询参数 |

### 执行测试

```
POST /v1/tenants/:slug/query/test
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `endpoint_id` | int64 | 是 | 接口 ID |
| `env_id` | int64 | 否 | 目标环境 |
| `params` | object | 否 | 查询参数 |
| `ignore_scripts` | bool | 否 | 是否跳过脚本 |

### 获取数据库 Schema

```
GET /v1/tenants/:slug/datasources/:datasourceId/schema
```

通过网关查询 `information_schema`，返回所有表及字段定义：

```json
[{ "name": "users", "columns": [{ "name": "id", "type": "bigint", "nullable": false }] }]
```

### 预览表数据

```
GET /v1/tenants/:slug/datasources/:datasourceId/tables/:table/preview
```

| 查询参数 | 类型 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `limit` | int | 最多返回行数（上限 500） | `100` |

---

## 公开接口调用

已发布的接口通过专用 `/-/` 前缀对外暴露：

```
GET|POST|PUT|DELETE /-/:env/:tenantSlug/:projectSlug/*path
```

- `:env` — 目标环境名（如 `prod` / `dev`）
- `:tenantSlug` / `:projectSlug` — 租户与项目标识
- `*path` — 接口定义的路径（支持路径参数）

**鉴权：** 取决于项目的鉴权配置——`public` 无需认证；`api_key` 需带 API Key；`jwt` 需带项目签发的 JWT。

**参数传递规则：**

| 请求方法 | 参数来源 |
| :--- | :--- |
| `GET` / `DELETE` | Query String |
| `POST` / `PUT` | JSON Body |
| 路径参数（如 `:id`） | 从 URL 提取，优先级最高 |

**行为说明：**
- 调用该环境当前**激活的版本快照**执行，编辑草稿不影响线上
- 若该环境下接口未激活（已下线）返回 404
- 参数经 `param_defs` 校验：缺少必填参数返回 400，有默认值的参数自动补全

---

## 公开 OpenAPI 分享

```
GET /public/openapi/:token
```

凭项目生成的分享 token 无认证获取该项目的 OpenAPI 规范（见[项目管理 · OpenAPI 分享链接](#openapi-分享链接)）。

---

## 企业版（EE）

::: tip
以下接口仅在 **EE 许可证生效**时注册（社区版无此路由）；且 EE handler 未纳入 Swagger，故不出现在 `/swagger`。请求/响应字段为 **camelCase**（与核心 API 的 snake_case 不同）。
:::

### SDK 发布（Admin+）

```
GET    /v1/tenants/:slug/projects/:projectId/sdk-publish/config                 # 获取发布配置（不含 token）
POST   /v1/tenants/:slug/projects/:projectId/sdk-publish/config                 # 保存发布配置
DELETE /v1/tenants/:slug/projects/:projectId/sdk-publish/config/gitlab-project  # 解绑 GitLab 仓库（仅清本地记录）
POST   /v1/tenants/:slug/projects/:projectId/sdk-publish/run                    # 执行发版（同步：生成 → 推送 → 打 tag）
GET    /v1/tenants/:slug/projects/:projectId/sdk-publish/runs                   # 发版历史
```

**保存配置请求体：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `gitlabBaseUrl` | string | GitLab 实例地址 |
| `gitlabGroupId` | int64 | GitLab Group ID |
| `gitlabToken` | string | GitLab Access Token（仅写入，响应不回显） |
| `npmScope` | string | npm scope |
| `npmPackageName` | string | npm 包名 |
| `pyPackageName` | string | Python 包名 |
| `languages` | array | 目标语言列表 |
| `runnerTags` | array | GitLab CI Runner 标签 |

**执行发版请求体：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `env` | string | 目标环境 |
| `languages` | array | 本次发布的语言（缺省用配置） |
| `version` | string | 版本号（手动策略下必填） |

---

## 其他

### 健康检查（公开）

```
GET /health
```

**响应 data：** `{ "status": "ok" }`

### Swagger UI（公开）

```
GET /swagger/index.html
```
