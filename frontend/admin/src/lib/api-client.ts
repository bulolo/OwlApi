import {
  OpenAPI,
  AuthService,
  TenantsService,
  UsersService,
  type RegisterRequest,
  type LoginRequest,
  type AuthResponse,
  type Tenant,
  type TenantUser,
  type CreateTenantRequest,
  type AddUserRequest,
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
    // 401 → token 失效，自动跳转登录页
    if (err?.status === 401 || err?.body?.code === 401) {
      clearToken()
      localStorage.removeItem('owlapi_user')
      if (typeof window !== 'undefined') {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      }
    }
    if (err?.body && typeof err.body === 'object' && 'msg' in err.body) {
      throw new Error(err.body.msg)
    }
    throw err
  }
}

// ---- Token 管理 ----

export function setToken(token: string) {
  localStorage.setItem('owlapi_token', token)
  document.cookie = `owlapi_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`
}

export function clearToken() {
  localStorage.removeItem('owlapi_token')
  document.cookie = 'owlapi_token=; path=/; max-age=0'
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
  return unwrap<PaginatedData<Tenant>>(TenantsService.myTenants(page, size))
}

export async function apiGetTenant(slug: string): Promise<Tenant> {
  return unwrap<Tenant>(TenantsService.getTenant(slug))
}

export async function apiCreateTenant(req: CreateTenantRequest): Promise<Tenant> {
  return unwrap<Tenant>(TenantsService.createTenant(req))
}

export async function apiUpdateTenant(slug: string, data: { name?: string; plan?: string; status?: string }): Promise<Tenant> {
  return unwrap<Tenant>(TenantsService.updateTenant(slug, data as any))
}

export async function apiDeleteTenant(slug: string): Promise<void> {
  await unwrap<any>(TenantsService.deleteTenant(slug))
}

// ---- Users (tenant-scoped) ----

export async function apiListUsers(slug: string, page = 1, size = 10): Promise<PaginatedData<TenantUser>> {
  return unwrap<PaginatedData<TenantUser>>(UsersService.listUsers(slug, page, size))
}

export async function apiAddUser(slug: string, req: AddUserRequest) {
  return unwrap<any>(UsersService.addUser(slug, req))
}

export async function apiUpdateUserRole(slug: string, userId: number, role: string) {
  return unwrap<any>(UsersService.updateUserRole(slug, userId, { role: role as any }))
}

export async function apiRemoveUser(slug: string, userId: number) {
  return unwrap<any>(UsersService.removeUser(slug, userId))
}

// Re-export types for convenience
export type { AuthResponse, Tenant, TenantUser, RegisterRequest, LoginRequest, PaginatedData, PaginationInfo }
