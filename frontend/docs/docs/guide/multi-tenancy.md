# 多租户与权限

OwlApi 原生支持多租户隔离，确保不同企业/团队之间的数据完全隔离。

## 核心实体

| 实体 | 说明 |
| :--- | :--- |
| `Tenant` | 租户，包含 name、slug、plan (Free/Pro/Enterprise)、status (Active/Warning/Suspended) |
| `User` | 用户，包含 email、name、is_superadmin 标识 |
| `TenantUser` | 用户与租户的关联关系，包含角色 (Admin / Viewer) |

## 角色体系

| 角色 | 权限 |
| :--- | :--- |
| SuperAdmin | 全局管理员，可管理所有租户，绕过租户级权限检查 |
| Admin | 租户管理员，可管理租户内用户（添加/移除/改角色） |
| Viewer | 租户只读成员，可查看租户信息和用户列表 |

## 权限校验流程

1. **JWT 鉴权** — 所有需认证的接口通过 `Authorization: Bearer <token>` 校验
2. **SuperAdmin 检查** — SuperAdmin 直接放行，不做租户级校验
3. **租户角色检查** — 通过 URL 中的 `:slug` 参数定位租户，查询 `TenantUser` 表获取用户角色，判断是否满足最低角色要求

## 数据隔离

- **数据层** — 核心表通过 `tenant_id` 进行隔离，查询强制包含租户过滤
- **连接层** — gRPC 连接池基于 `tenant_id + gateway_id` 索引（规划中）
- **Gateway 归属** — Gateway 启动时通过 `OWLAPI_TENANT_ID` 环境变量声明归属租户

## 注册流程

用户注册时可同时创建首个租户：

```
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "name": "User",
  "password": "...",
  "tenant_name": "My Org",    // 可选，同时创建租户
  "tenant_slug": "my-org"     // 可选
}
```

注册成功后用户自动成为该租户的 Admin。
