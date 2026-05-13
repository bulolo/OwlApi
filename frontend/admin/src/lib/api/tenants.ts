import { myTenants, getTenant, createTenant, updateTenant, updateTenantSettings, deleteTenant } from '@/lib/sdk'
import type { Tenant, ListQuery, PaginatedData, CreateTenantRequest, UpdateTenantRequest } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListTenants = (q: ListQuery = {}) =>
  myTenants({ query: q }) as unknown as Promise<PaginatedData<Tenant>>

export const apiGetTenant = (slug: string) =>
  getTenant({ path: { slug } }) as unknown as Promise<Tenant>

export const apiCreateTenant = (req: CreateTenantRequest) =>
  createTenant({ body: req }) as unknown as Promise<Tenant>

export const apiUpdateTenant = (slug: string, req: UpdateTenantRequest) =>
  updateTenant({ path: { slug }, body: req }) as unknown as Promise<Tenant>

export const apiUpdateTenantSettings = (slug: string, maxReleaseVersions: number) =>
  updateTenantSettings({ path: { slug }, body: { max_release_versions: maxReleaseVersions } }) as unknown as Promise<Tenant>

export const apiDeleteTenant = (slug: string) =>
  deleteTenant({ path: { slug } }) as unknown as Promise<void>
