import { myTenants, getTenant, createTenant, updateTenant, updateTenantSettings, deleteTenant } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { Tenant, ListQuery, PaginatedData, CreateTenantRequest, UpdateTenantRequest } from './types'

export const apiListTenants = (q: ListQuery = {}) =>
  wrapResponse<PaginatedData<Tenant>>(myTenants({ query: q }))

export const apiGetTenant = (slug: string) =>
  wrapResponse<Tenant>(getTenant({ path: { slug } }))

export const apiCreateTenant = (req: CreateTenantRequest) =>
  wrapResponse<Tenant>(createTenant({ body: req }))

export const apiUpdateTenant = (slug: string, req: UpdateTenantRequest) =>
  wrapResponse<Tenant>(updateTenant({ path: { slug }, body: req }))

export const apiUpdateTenantSettings = (slug: string, maxReleaseVersions: number) =>
  wrapResponse<Tenant>(updateTenantSettings({ path: { slug }, body: { max_release_versions: maxReleaseVersions } }))

export const apiDeleteTenant = (slug: string) =>
  wrapResponse<void>(deleteTenant({ path: { slug } }))
