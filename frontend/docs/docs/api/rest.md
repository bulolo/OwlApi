# REST API

Control Plane 对外暴露的 HTTP API，基于 Gin 框架，默认监听 `:3000`。

Swagger UI：启动服务后访问 http://localhost:3000/swagger/index.html

## 认证

除注册、登录和平台设置查询外，所有接口需要 JWT 认证：

```
Authorization: Bearer <token>
```

---

## 统一响应格式

所有接口均返回以下结构：

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

支持分页的接口均接受以下查询参数：

| 参数 | 类型 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `page` | int | 页码 | `1` |
| `size` | int | 每页条数（最大 100） | `10` |
| `is_pager` | int | `0` = 返回全部；`1` = 分页 | `1` |
| `keyword` | string | 关键词搜索 | — |

### HTTP 状态码

| 状态码 | 含义 |
| :--- | :--- |
| 200 | 成功（业务错误也在 200 中通过 `code` 区分） |
| 400 | 请求参数错误 |
| 401 | 未认证或 token 无效/过期 |
| 403 | 权限不足 |
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

---

## 平台设置

### 获取（公开）

```
GET /v1/platform/settings
```

### 更新（SuperAdmin）

```
PUT /v1/platform/settings
```

**请求体：**

```json
{ "allow_self_register": true }
```

**响应 data：**

```json
{ "allow_self_register": true }
```

---

## 租户管理

### 我的租户列表（已登录）

```
GET /v1/my/tenants
```

SuperAdmin 返回所有租户；普通用户返回已加入的租户。支持分页参数。

### 列表（SuperAdmin）

```
GET /v1/tenants
```

支持分页参数。

### 创建（SuperAdmin）

```
POST /v1/tenants
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 租户名称 |
| `slug` | string | 是 | 唯一标识，用于 URL |
| `plan` | string | 否 | `Free` / `Pro` / `Enterprise` |

### 详情（Viewer+）

```
GET /v1/tenants/:slug
```

### 更新（SuperAdmin）

```
PUT /v1/tenants/:slug
```

**请求体：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `name` | string | 租户名称 |
| `plan` | string | 订阅计划 |
| `status` | string | `Active` / `Warning` / `Suspended` |

### 删除（SuperAdmin）

```
DELETE /v1/tenants/:slug
```

### 更新租户配置（Admin+）

```
PUT /v1/tenants/:slug/settings
```

**请求体：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `max_release_versions` | int | 每个接口保留的最大历史版本数 |

---

## 用户管理

### 列表（Viewer+）

```
GET /v1/tenants/:slug/users
```

支持分页参数。

### 添加成员（Admin+）

```
POST /v1/tenants/:slug/users
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 邮箱 |
| `name` | string | 是 | 用户名 |
| `password` | string | 是 | 初始密码 |
| `role` | string | 是 | `Admin` 或 `Viewer` |

### 修改角色（Admin+）

```
PUT /v1/tenants/:slug/users/:userId/role
```

**请求体：**

```json
{ "role": "Admin" }
```

### 移除成员（Admin+）

```
DELETE /v1/tenants/:slug/users/:userId
```

---

## 网关管理

### 列表（Viewer+）

```
GET /v1/tenants/:slug/gateways
```

支持分页参数。

### 详情（Viewer+）

```
GET /v1/tenants/:slug/gateways/:gatewayId
```

### 创建（Admin+）

```
POST /v1/tenants/:slug/gateways
```

**请求体：**

```json
{ "name": "IDC-Primary" }
```

**响应 data：**

```json
{
  "id": 1, "name": "IDC-Primary", "token": "gw_xxx...",
  "status": "offline", "is_platform": false
}
```

::: warning
`token` 仅在创建时返回完整值，请妥善保存。后续查询不再返回 token 明文。
:::

### 删除（Admin+）

```
DELETE /v1/tenants/:slug/gateways/:gatewayId
```

---

## 数据源管理

::: tip
响应中的 DSN 密码部分会被自动脱敏（替换为 `***`）。
:::

### 列表（Viewer+）

```
GET /v1/tenants/:slug/datasources
```

支持分页参数。

### 详情（Viewer+）

```
GET /v1/tenants/:slug/datasources/:datasourceId
```

### 创建（Admin+）

```
POST /v1/tenants/:slug/datasources
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 数据源名称 |
| `type` | string | 是 | `mysql` / `postgres` / `sqlserver` / `starrocks` / `doris` / `sqlite` |
| `is_dual` | bool | 否 | 是否配置双环境（prod + dev） |
| `envs` | array | 是（至少 1 个） | 环境配置列表，见下表 |

**`envs` 子项：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `env` | string | 是 | `prod` 或 `dev` |
| `dsn` | string | — | 数据库连接串 |
| `gateway_id` | int64 | 是 | 负责执行查询的网关 ID |

**示例：**

```json
{
  "name": "主数据库",
  "type": "mysql",
  "is_dual": false,
  "envs": [
    { "env": "prod", "dsn": "user:pass@tcp(host:3306)/db", "gateway_id": 1 }
  ]
}
```

### 更新（Admin+）

```
PUT /v1/tenants/:slug/datasources/:datasourceId
```

字段同创建，均可选。若提供 `envs` 则全量替换原有环境配置。

### 删除（Admin+）

```
DELETE /v1/tenants/:slug/datasources/:datasourceId
```

### 测试连通性（Admin+）

```
POST /v1/tenants/:slug/datasources/test
```

**请求体：**

```json
{ "dsn": "user:pass@tcp(host:3306)/db", "gateway_id": 1 }
```

**响应 data：**

```json
{ "latency_ms": 12 }
```

---

## 项目管理

### 列表（Viewer+）

```
GET /v1/tenants/:slug/projects
```

支持分页参数。

### 详情（Viewer+）

```
GET /v1/tenants/:slug/projects/:projectId
```

### 创建（Admin+）

```
POST /v1/tenants/:slug/projects
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `slug` | string | 是 | 项目标识，用于 API 路由路径 |
| `name` | string | 是 | 项目名称 |
| `description` | string | 否 | 项目描述 |

### 更新（Admin+）

```
PUT /v1/tenants/:slug/projects/:projectId
```

字段同创建，均可选。

### 删除（Admin+）

```
DELETE /v1/tenants/:slug/projects/:projectId
```

### 导出 OpenAPI 规范（Viewer+）

```
GET /v1/tenants/:slug/projects/:projectId/openapi.json
```

导出项目所有接口的 **OpenAPI 3.0.3** 规范（JSON 格式），可直接导入 Apifox、Postman 等工具。响应附带 `Content-Disposition: attachment` 头触发下载。

---

## 接口分组

### 列表（Viewer+）

```
GET /v1/tenants/:slug/projects/:projectId/groups
```

支持分页参数。

### 创建（Admin+）

```
POST /v1/tenants/:slug/projects/:projectId/groups
```

**请求体：**

```json
{ "name": "用户接口", "description": "..." }
```

### 更新（Admin+）

```
PUT /v1/tenants/:slug/projects/:projectId/groups/:groupId
```

### 删除（Admin+）

```
DELETE /v1/tenants/:slug/projects/:projectId/groups/:groupId
```

---

## 接口管理

### 列表（Viewer+）

```
GET /v1/tenants/:slug/projects/:projectId/endpoints
```

支持分页参数。

### 创建（Admin+）

```
POST /v1/tenants/:slug/projects/:projectId/endpoints
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `path` | string | 是 | 接口路径，如 `/users/:id` |
| `methods` | string[] | 是 | HTTP 方法，如 `["GET"]` |
| `sql` | string | 是 | SQL 查询语句 |
| `summary` | string | 否 | 接口摘要 |
| `description` | string | 否 | 接口描述 |
| `datasource_id` | int64 | 否 | 数据源 ID |
| `group_id` | int64 | 否 | 分组 ID |
| `pre_script_id` | int64 | 否 | 前置脚本 ID |
| `post_script_id` | int64 | 否 | 后置脚本 ID |
| `param_defs` | array | 否 | 参数定义，见下表 |

**`param_defs` 子项：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `name` | string | 参数名 |
| `type` | string | `string` / `integer` / `number` / `boolean` |
| `required` | bool | 是否必填 |
| `default` | string | 默认值 |
| `desc` | string | 参数说明 |

**示例：**

```json
{
  "path": "/users/:id",
  "methods": ["GET"],
  "sql": "SELECT * FROM users WHERE id = :id",
  "summary": "获取用户",
  "datasource_id": 1,
  "param_defs": [
    { "name": "id", "type": "integer", "required": true, "desc": "用户 ID" }
  ]
}
```

### 更新（Admin+）

```
PUT /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId
```

字段同创建，均可选。更新成功后自动创建/更新草稿版本。

### 删除（Admin+）

```
DELETE /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId
```

---

## 版本管理

### 列表（Viewer+）

```
GET /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId/releases
```

支持分页参数。

### 发布（Admin+）

```
POST /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId/releases
```

**请求体：**

```json
{ "note": "修复分页逻辑" }
```

发布后接口状态变为 `published`，调用网关立即使用新版本快照。保留版本数受租户 `max_release_versions` 限制，超出后自动删除最旧版本。

### 回滚（Admin+）

```
PUT /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId/releases/:releaseId/activate
```

将接口切换到指定历史版本，调用网关立即使用该版本快照。

### 下线（Admin+）

```
PUT /v1/tenants/:slug/projects/:projectId/endpoints/:endpointId/unpublish
```

下线后接口状态变为 `draft`，调用网关对该路径返回 404。

---

## 脚本管理

### 列表（Viewer+）

```
GET /v1/tenants/:slug/scripts
```

支持分页参数。

### 创建（Admin+）

```
POST /v1/tenants/:slug/scripts
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 脚本名称 |
| `type` | string | 是 | `pre`（前置）或 `post`（后置） |
| `code` | string | 是 | JavaScript 代码 |
| `description` | string | 否 | 说明 |

前置脚本在 SQL 执行前运行，可修改参数 `params`；后置脚本在 SQL 执行后运行，可转换查询结果。

### 更新（Admin+）

```
PUT /v1/tenants/:slug/scripts/:scriptId
```

字段同创建，均可选。

### 删除（Admin+）

```
DELETE /v1/tenants/:slug/scripts/:scriptId
```

---

## 调试工具

以下接口用于开发阶段调试，需 Viewer+ 权限，不影响已发布接口。

### 获取数据库 Schema（Viewer+）

```
GET /v1/tenants/:slug/datasources/:datasourceId/schema
```

通过网关查询 `information_schema`，返回所有表及字段定义：

```json
[
  {
    "name": "users",
    "columns": [
      { "name": "id", "type": "bigint", "nullable": false }
    ]
  }
]
```

### 预览表数据（Viewer+）

```
GET /v1/tenants/:slug/datasources/:datasourceId/tables/:table/preview
```

| 查询参数 | 类型 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `limit` | int | 最多返回行数（上限 500） | `100` |

### 执行调试（Viewer+）

```
POST /v1/tenants/:slug/query/test
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `endpoint_id` | int64 | 是 | 接口 ID |
| `params` | object | 否 | 查询参数 `{ "key": "value" }` |
| `ignore_scripts` | bool | 否 | 是否跳过前置/后置脚本 |

返回原始查询结果 JSON。

---

## 公开接口调用

已发布的接口通过以下路由对外暴露，**无需认证**：

```
GET|POST|PUT|DELETE /:tenantSlug/:projectSlug/*path
```

**参数传递规则：**

| 请求方法 | 参数来源 |
| :--- | :--- |
| `GET` / `DELETE` | Query String |
| `POST` / `PUT` | JSON Body |
| 路径参数（如 `:id`） | 从 URL 提取，优先级最高 |

**行为说明：**
- 路由按接口定义的路径模式匹配，支持路径参数
- 接口使用发布时的**快照**执行，编辑草稿不影响已发布版本
- 若接口已下线（状态为 `draft`）返回 404
- 参数经过 `param_defs` 校验：缺少必填参数返回 400，有默认值的参数自动补全

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
