import { myTenants, getTenant, createTenant, updateTenant, deleteTenant } from '@/lib/sdk'
import type { Tenant, ListQuery, PaginatedData, CreateTenantRequest, UpdateTenantRequest } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListTenants = (q: ListQuery = {}) => cast<PaginatedData<Tenant>>(myTenants({ query: q }))
export const apiGetTenant = (slug: string) => cast<Tenant>(getTenant({ path: { slug } }))
export const apiCreateTenant = (req: CreateTenantRequest) => cast<Tenant>(createTenant({ body: req }))
export const apiUpdateTenant = (slug: string, req: UpdateTenantRequest) => cast<Tenant>(updateTenant({ path: { slug }, body: req }))
export const apiDeleteTenant = (slug: string) => cast<void>(deleteTenant({ path: { slug } }))
