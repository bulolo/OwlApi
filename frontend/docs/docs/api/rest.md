# REST API

Control Plane 对外暴露的 HTTP API，基于 Gin 框架，默认监听 `:3000`。

在线文档：启动服务后访问 http://localhost:3000/swagger/index.html

## 认证

除注册和登录外，所有接口需要 JWT 认证：

```
Authorization: Bearer <token>
```

## Auth 认证

### 注册

```
POST /api/v1/auth/register
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| email | string | 是 | 邮箱 |
| name | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| tenant_name | string | 否 | 同时创建租户 |
| tenant_slug | string | 否 | 租户 slug |

### 登录

```
POST /api/v1/auth/login
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |

返回 JWT token、用户信息和租户列表。

## 租户管理

### 当前用户的租户列表

```
GET /api/v1/my/tenants
```

SuperAdmin 返回所有租户，普通用户返回已加入的租户。

### 租户 CRUD (SuperAdmin)

```
GET    /api/v1/tenants                # 列表 (支持分页: page, size, is_pager)
POST   /api/v1/tenants                # 创建 (name, slug, plan)
PUT    /api/v1/tenants/:slug          # 更新 (name, plan, status)
DELETE /api/v1/tenants/:slug          # 删除
```

### 获取租户详情 (Viewer+)

```
GET /api/v1/tenants/:slug
```

## 用户管理

### 租户用户列表 (Viewer+)

```
GET /api/v1/tenants/:slug/users
```

支持分页参数：`page`, `size`, `is_pager`

### 添加用户 (Admin+)

```
POST /api/v1/tenants/:slug/users
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| email | string | 是 | 邮箱 |
| name | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| role | string | 是 | 角色：`Admin` 或 `Viewer` |

### 修改角色 (Admin+)

```
PUT /api/v1/tenants/:slug/users/:userId/role
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| role | string | 是 | `Admin` 或 `Viewer` |

### 移除用户 (Admin+)

```
DELETE /api/v1/tenants/:slug/users/:userId
```

## 响应格式

成功响应：

```json
{
  "code": 0,
  "data": { ... }
}
```

分页响应：

```json
{
  "code": 0,
  "data": {
    "list": [...],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 100,
      "is_pager": 1
    }
  }
}
```

错误响应：

```json
{
  "code": -1,
  "message": "error description"
}
```

## 错误码

| HTTP 状态码 | 含义 |
| :--- | :--- |
| 400 | 请求参数错误 |
| 401 | 未认证或 token 无效/过期 |
| 403 | 权限不足 (需要 SuperAdmin 或更高租户角色) |
| 404 | 租户不存在 |
| 409 | 资源冲突 (如邮箱已注册、slug 已存在) |
| 500 | 服务器内部错误 |
