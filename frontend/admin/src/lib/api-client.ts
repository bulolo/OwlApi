import {
  OpenAPI,
  AuthService,
  TenantsService,
  UsersService,
  GatewaysService,
  DataSourcesService,
  ProjectsService,
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
    // 网络错误（后端未启动、CORS 等）
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      console.error('[OwlApi] 无法连接后端服务，请确认 API 服务已启动:', OpenAPI.BASE)
      throw new Error('无法连接服务器，请检查后端是否已启动')
    }
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

// ---- Gateways (tenant-scoped) ----

export type Gateway = {
  id: number
  tenant_id: number
  name: string
  token?: string
  status: string
  ip: string
  last_seen: string
  version: string
}

export type CreateGatewayResponse = {
  id: number
  tenant_id: number
  name: string
  token: string
  status: string
  version: string
}

export async function apiListGateways(slug: string): Promise<{ list: Gateway[]; total: number }> {
  return unwrap<{ list: Gateway[]; total: number }>(GatewaysService.listGateways(slug))
}

export async function apiCreateGateway(slug: string, name: string): Promise<CreateGatewayResponse> {
  return unwrap<CreateGatewayResponse>(GatewaysService.createGateway(slug, { name }))
}

export async function apiGetGateway(slug: string, gatewayId: number): Promise<Gateway> {
  return unwrap<Gateway>(GatewaysService.getGateway(slug, gatewayId))
}

export async function apiDeleteGateway(slug: string, gatewayId: number): Promise<void> {
  await unwrap<any>(GatewaysService.deleteGateway(slug, gatewayId))
}

// ---- DataSources (tenant-scoped) ----

export type DataSourceEnv = {
  id: number
  datasource_id: number
  env: string
  dsn?: string
  gateway_id: number
}

export type DataSource = {
  id: number
  tenant_id: number
  name: string
  is_dual: boolean
  type: string
  envs?: DataSourceEnv[]
  created_at: string
}

export async function apiListDataSources(slug: string): Promise<{ list: DataSource[]; total: number }> {
  return unwrap<{ list: DataSource[]; total: number }>(DataSourcesService.listDataSources(slug))
}

export async function apiCreateDataSource(slug: string, req: {
  name: string; type: string; is_dual: boolean;
  envs: { env: string; dsn: string; gateway_id: number }[]
}): Promise<DataSource> {
  return unwrap<DataSource>(DataSourcesService.createDataSource(slug, req as any))
}

export async function apiGetDataSource(slug: string, datasourceId: number): Promise<DataSource> {
  return unwrap<DataSource>(DataSourcesService.getDataSource(slug, datasourceId))
}

export async function apiDeleteDataSource(slug: string, datasourceId: number): Promise<void> {
  await unwrap<any>(DataSourcesService.deleteDataSource(slug, datasourceId))
}

export async function apiUpdateDataSource(slug: string, datasourceId: number, req: {
  name?: string; type?: string; is_dual?: boolean;
  envs?: { env: string; dsn: string; gateway_id: number }[]
}): Promise<DataSource> {
  return unwrap<DataSource>(DataSourcesService.updateDataSource(slug, datasourceId, req as any))
}

// ---- Projects (tenant-scoped) ----

export type Project = {
  id: number
  tenant_id: number
  name: string
  description: string
  datasource_id: number
  created_at: string
}

export async function apiListProjects(slug: string): Promise<{ list: Project[]; total: number }> {
  return unwrap<{ list: Project[]; total: number }>(ProjectsService.listProjects(slug))
}

export async function apiCreateProject(slug: string, req: { name: string; description?: string; datasource_id: number }): Promise<Project> {
  return unwrap<Project>(ProjectsService.createProject(slug, req as any))
}

export async function apiGetProject(slug: string, projectId: number): Promise<Project> {
  return unwrap<Project>(ProjectsService.getProject(slug, projectId))
}

export async function apiUpdateProject(slug: string, projectId: number, req: { name?: string; description?: string; datasource_id?: number }): Promise<Project> {
  return unwrap<Project>(ProjectsService.updateProject(slug, projectId, req as any))
}

export async function apiDeleteProject(slug: string, projectId: number): Promise<void> {
  await unwrap<any>(ProjectsService.deleteProject(slug, projectId))
}

// ---- API Endpoints (project-scoped) ----

import { EndpointsService } from '@/lib/sdk'

export type APIEndpoint = {
  id: number
  tenant_id: number
  project_id: number
  path: string
  methods: string[]
  sql: string
  params: string[]
  created_at: string
}

export async function apiListEndpoints(slug: string, projectId: number): Promise<{ list: APIEndpoint[]; total: number }> {
  return unwrap<{ list: APIEndpoint[]; total: number }>(EndpointsService.listEndpoints(slug, projectId))
}

export async function apiCreateEndpoint(slug: string, projectId: number, req: { path: string; methods: string[]; sql: string; params?: string[] }): Promise<APIEndpoint> {
  return unwrap<APIEndpoint>(EndpointsService.createEndpoint(slug, projectId, req as any))
}

export async function apiDeleteEndpoint(slug: string, projectId: number, endpointId: number): Promise<void> {
  await unwrap<any>(EndpointsService.deleteEndpoint(slug, projectId, endpointId))
}

// ---- Query Test ----

export async function apiTestQuery(slug: string, datasourceId: number, sql: string, env = "prod"): Promise<any[]> {
  const token = getToken()
  const res = await fetch(`${OpenAPI.BASE}/api/v1/tenants/${slug}/query/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ datasource_id: datasourceId, sql, env }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.msg || `Query failed: ${res.status}`)
  }
  // Response is raw JSON array from gateway
  return res.json()
}
