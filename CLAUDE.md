# OwlApi – Project Conventions

## Frontend Hook Conventions

- **`src/hooks/`** — cross-module hooks reused across 2+ pages (e.g. `useDataSources`, `useGateways`)
- **`_hooks/` co-located** — module-internal hooks only used within that module (e.g. `apis/_hooks/useTenantProject.ts`)

## Frontend Component Structure

Complex modules follow a co-location pattern:

```
module/
  _components/   # sub-components (not exported outside module)
  _hooks/        # module-internal hooks
  _store/        # module-local Zustand stores
  _types/        # module-local TypeScript types
  page.tsx       # thin Next.js page wrapper
  XxxClientPage.tsx  # main client component
```

Examples of modules following this pattern:
- `app/[slug]/projects/[id]/apis/` — fully structured (reference implementation)
- `app/[slug]/gateways/` — `_components/GatewayCard`, `_components/GatewayDeployPanel`
- `app/[slug]/scripts/` — `_components/ScriptItem`, `_components/ScriptEditor`
- `app/[slug]/users/` — `_components/AddUserForm`, `_components/UserRow`

## Tenant Access Convention

Use `useTenant()` from `@/providers/TenantProvider` to get the active tenant slug in client components. Do **not** use `useUIStore().activeTenant` — that pattern is deprecated in favour of the provider.

```ts
import { useTenant } from "@/providers/TenantProvider"

const activeTenant = useTenant()
```
