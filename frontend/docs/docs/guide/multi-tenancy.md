# 多租户与权限

OwlApi 原生支持多租户隔离，确保不同企业/团队之间的数据完全隔离。

## 核心实体

| 实体 | 说明 |
| :--- | :--- |
| `Tenant` | 租户，包含 name、slug、plan (Free/Pro/Enterprise)、status (Active/Warning/Suspended)、max_release_versions |
| `User` | 用户，包含 email、name、is_superadmin 标识（全局唯一，可加入多个租户） |
| `TenantUser` | 用户与租户的关联关系，包含角色 (Admin / Viewer) |

## 角色体系

| 角色 | 作用域 | 权限 |
| :--- | :--- | :--- |
| **SuperAdmin** | 全局 | 管理所有租户（CRUD）、修改平台设置，绕过所有租户级权限 |
| **Admin** | 租户级 | 管理租户内用户、Gateway、数据源、项目、接口、脚本 |
| **Viewer** | 租户级 | 只读访问租户内所有资源，可调试查询 |

## 权限校验流程

```
请求到达
  │
  ▼
JWTAuth 中间件（验证 Bearer Token，解析 userID + isSuperAdmin）
  │
  ├─ RequireSuperAdmin() → 检查 is_superadmin 字段
  │
  └─ RequireTenantRole(minRole)
       │
       ├─ SuperAdmin → 直接放行
       │
       └─ 普通用户 → 通过 URL :slug 定位租户 →
              查询 tenant_users 表获取角色 →
              对比 minRole（Viewer < Admin）
```

## 数据隔离

- **数据层** — 所有业务表通过 `tenant_id` 列隔离，查询强制包含 `WHERE tenant_id = ?`
- **无外键约束** — 应用层保证引用完整性，避免跨租户级联删除的风险
- **Gateway 归属** — Gateway 通过 `tenant_id` 字段声明归属租户，跨租户调用在 Service 层拦截

## 注册流程

```
POST /v1/auth/register
{
  "email": "user@example.com",
  "name": "张三",
  "password": "...",
  "tenant_name": "我的团队",    // 可选，同时创建租户
  "tenant_slug": "my-team"     // 可选，需唯一
}
```

注册成功后用户自动成为该租户的 **Admin**。

## 租户设置

Admin 可通过以下接口修改租户级别配置：

```
PUT /v1/tenants/:slug/settings
{
  "max_release_versions": 20    // 每个接口保留的历史版本数量上限
}
```

## 平台设置

SuperAdmin 管理全局配置：

```
GET  /v1/platform/settings           // 公开接口
PUT  /v1/platform/settings           // 仅 SuperAdmin
{
  "allow_self_register": true        // 是否允许用户自行注册
}
```
