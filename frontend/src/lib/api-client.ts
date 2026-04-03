import {
  OpenAPI,
  AuthService,
  TenantsService,
  MembersService,
  type RegisterRequest,
  type LoginRequest,
  type AuthResponse,
  type Tenant,
  type TenantMember,
  type CreateTenantRequest,
  type AddMemberRequest,
} from '@/lib/sdk'

// ---- 配置 ----

OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
OpenAPI.TOKEN = async () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('owlapi_token') || ''
  }
  return ''
}

// ---- Unwrap {code, msg, data} response ----

type PaginationInfo = {
  is_pager: number
  page: number
  size: number
  total: number
}

type PaginatedData<T> = {
  list: T[]
  pagination: PaginationInfo
}

async function unwrap<T>(promise: Promise<any>): Promise<T> {
  try {
    const res = await promise
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code !== 0) {
        throw new Error(res.msg || 'request failed')
      }
      return res.data as T
    }
    return res as T
  } catch (err: any) {
    if (err?.body && typeof err.body === 'object' && 'msg' in err.body) {
      throw new Error(err.body.msg)
    }
    throw err
  }
}

// ---- Token 管理 ----

export function setToken(token: string) {
  localStorage.setItem('owlapi_token', token)
}

export function clearToken() {
  localStorage.removeItem('owlapi_token')
}

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('owlapi_token') : null
}

// ---- Auth ----

export async function apiLogin(req: LoginRequest): Promise<AuthResponse> {
  const res = await unwrap<AuthResponse>(AuthService.login(req))
  if (res.token) setToken(res.token)
  return res
}

export async function apiRegister(req: RegisterRequest): Promise<AuthResponse> {
  const res = await unwrap<AuthResponse>(AuthService.register(req))
  if (res.token) setToken(res.token)
  return res
}

// ---- Tenants ----

export async function apiListTenants(page = 1, size = 20): Promise<PaginatedData<Tenant>> {
  const res = await fetch(`${OpenAPI.BASE}/api/v1/tenants?page=${page}&size=${size}`)
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.msg)
  return json.data
}

export async function apiGetTenant(slug: string): Promise<Tenant> {
  return unwrap<Tenant>(TenantsService.getTenant(slug))
}

export async function apiCreateTenant(req: CreateTenantRequest): Promise<Tenant> {
  return unwrap<Tenant>(TenantsService.createTenant(req))
}

export async function apiUpdateTenant(slug: string, data: { name?: string; plan?: string; status?: string }): Promise<Tenant> {
  const res = await fetch(`${OpenAPI.BASE}/api/v1/tenants/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.msg)
  return json.data
}

export async function apiDeleteTenant(slug: string): Promise<void> {
  const res = await fetch(`${OpenAPI.BASE}/api/v1/tenants/${slug}`, { method: 'DELETE' })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.msg)
}

// ---- Members ----

export async function apiListMembers(slug: string, page = 1, size = 20): Promise<PaginatedData<TenantMember>> {
  const res = await fetch(`${OpenAPI.BASE}/api/v1/tenants/${slug}/members?page=${page}&size=${size}`)
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.msg)
  return json.data
}

export async function apiAddMember(slug: string, req: AddMemberRequest) {
  return unwrap<any>(MembersService.addMember(slug, req))
}

export async function apiUpdateMemberRole(slug: string, userId: string, role: string) {
  return unwrap<any>(MembersService.updateMemberRole(slug, userId, { role: role as any }))
}

export async function apiRemoveMember(slug: string, userId: string) {
  return unwrap<any>(MembersService.removeMember(slug, userId))
}

// Re-export types for convenience
export type { AuthResponse, Tenant, TenantMember, RegisterRequest, LoginRequest, PaginatedData, PaginationInfo }
