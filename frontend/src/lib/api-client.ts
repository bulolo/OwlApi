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
  const res = await AuthService.login(req)
  if (res.token) setToken(res.token)
  return res
}

export async function apiRegister(req: RegisterRequest): Promise<AuthResponse> {
  const res = await AuthService.register(req)
  if (res.token) setToken(res.token)
  return res
}

// ---- Tenants ----

export async function apiListTenants(): Promise<Tenant[]> {
  return TenantsService.listTenants()
}

export async function apiGetTenant(slug: string): Promise<Tenant> {
  return TenantsService.getTenant(slug)
}

export async function apiCreateTenant(req: CreateTenantRequest): Promise<Tenant> {
  return TenantsService.createTenant(req)
}

// ---- Members ----

export async function apiListMembers(slug: string): Promise<TenantMember[]> {
  return MembersService.listMembers(slug)
}

export async function apiAddMember(slug: string, req: AddMemberRequest) {
  return MembersService.addMember(slug, req)
}

export async function apiUpdateMemberRole(slug: string, userId: string, role: string) {
  return MembersService.updateMemberRole(slug, userId, { role: role as any })
}

export async function apiRemoveMember(slug: string, userId: string) {
  return MembersService.removeMember(slug, userId)
}

// Re-export types for convenience
export type { AuthResponse, Tenant, TenantMember, RegisterRequest, LoginRequest }
