# 前端开发

本文档提供 Admin 管理控制台前端的开发指南。

## 🏗️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5.x
- **样式**: Tailwind CSS v4（`@theme` / `@theme inline` CSS 变量体系）
- **组件库**: shadcn/ui（基础组件）+ 自定义业务组件
- **状态管理**: TanStack Query（服务端状态）+ Zustand（客户端 UI 状态）
- **HTTP 客户端**: 自动生成的 TypeScript SDK（`src/lib/sdk/`）
- **包管理**: pnpm

---

## 📁 项目结构

```
frontend/admin/
├── src/
│   ├── app/                    # 页面路由（Next.js App Router）
│   │   ├── (auth)/             # 认证页面（login / register）
│   │   └── [slug]/             # 租户路由（overview / gateways / projects / ...）
│   ├── components/
│   │   ├── layout/             # 全局布局（Sidebar、Header、Modal）
│   │   ├── ui/                 # shadcn/ui 基础组件
│   │   └── ResultTable.tsx     # 通用结果表格
│   ├── hooks/                  # 跨模块复用 Hooks（useGateways、useProjects 等）
│   ├── lib/
│   │   ├── sdk/                # 后端自动生成的 TypeScript SDK（勿手动修改）
│   │   └── utils.ts            # 通用工具函数
│   ├── providers/              # React Context（TenantProvider）
│   └── store/                  # Zustand Store（useUIStore）
├── public/                     # 静态资源
└── tailwind.config.ts          # Tailwind 配置（v4 @theme 定义见 globals.css）
```

### 模块级目录约定

复杂模块遵循共位（co-location）结构：

```
app/[slug]/projects/[id]/apis/
├── _components/      # 模块内子组件（不对外导出）
├── _hooks/           # 模块内专用 Hooks
├── _store/           # 模块级 Zustand Store
├── _types/           # 模块级 TypeScript 类型
├── page.tsx          # Next.js 页面入口（薄层包装）
└── ApisClientPage.tsx  # 主客户端组件
```

---

## 🚀 快速开始

### 1. 环境初始化

在项目根目录下执行：
```bash
make dev-init
```

### 2. 启动开发服务器（Docker）

推荐使用 Docker 统一管理：
```bash
# 在项目根目录
make dev-up
```
访问地址：`http://localhost:8001`

### 3. 本地独立运行

如果只想在本地运行前端以获得更快的热重载：
```bash
cd frontend/admin
pnpm install
pnpm dev
```

> 独立运行时，需确保 `NEXT_PUBLIC_API_URL` 指向本地或远端的 Control Plane。

---

## 📝 开发规范

### SDK 使用原则

所有后端交互**必须**通过 `src/lib/sdk` 中生成的方法，禁止直接 `fetch`：

```typescript
import { apiGetGateways, apiCreateGateway } from '@/lib/api-client'

// ✅ 正确：通过 SDK 调用
const gateways = await apiGetGateways(tenantSlug, { page: 1, page_size: 20 })

// ❌ 错误：绕过 SDK 直接请求
const res = await fetch('/v1/tenants/xxx/gateways')
```

修改后端 DTO 后必须执行 `make gen-sdk` 重新生成 SDK，否则 CI 会因 drift 检测失败。

### 获取当前租户

在客户端组件中，统一通过 `useTenant()` 获取活跃租户 slug：

```typescript
import { useTenant } from '@/providers/TenantProvider'

// ✅ 正确
const activeTenant = useTenant()

// ❌ 错误：useUIStore().activeTenant 已废弃
```

### Hook 放置约定

| 位置 | 适用场景 |
|------|---------|
| `src/hooks/` | 跨模块复用的 Hook（被 2 个以上页面使用） |
| `module/_hooks/` | 仅在该模块内使用的 Hook |

### 添加新组件

1. **基础 UI 组件** — 使用 `pnpm dlx shadcn-ui@latest add [component]`，生成到 `src/components/ui/`
2. **布局组件** — 放入 `src/components/layout/`
3. **业务子组件** — 放入模块目录的 `_components/`，不向外导出

---

## 📚 相关文档

- [设计语言规范](/guide/style-guide)
- [后端开发指南](/guide/backend)
- [REST API 参考](/api/rest)
