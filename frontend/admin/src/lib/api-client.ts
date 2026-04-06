/**
 * OwlApi Client — 拦截器 + Token + 类型化 SDK 包装
 *
 * hey-api.ts 的 responseTransformer 全局拆 {code,msg,data} 信封。
 * 本文件提供类型化的一行包装函数，消除 SDK 返回 `unknown` 的问题。
 */

import { client } from '@/lib/sdk/client.gen'
import {
  login as sdkLogin, register as sdkRegister,
  myTenants, getTenant, createTenant, updateTenant, deleteTenant,
  listUsers, addUser, updateUserRole, removeUser,
  listGateways, createGateway, getGateway, deleteGateway,
  listDataSources, createDataSource, getDataSource, deleteDataSource, updateDataSource,
  listProjects, createProject, getProject, updateProject, deleteProject,
  listEndpoints, createEndpoint, deleteEndpoint, updateEndpoint,
  listGroups, createGroup, updateGroup, deleteGroup,
  listScripts, createScript, updateScript, deleteScript,
  testQuery, exportOpenApi,
} from '@/lib/sdk'
import type {
  TenantResp, TenantUserResp,
  GatewayResp,
  DataSourceResp, DataSourceEnvResp,
  ProjectResp,
  ApiEndpointResp,
  ApiGroupResp,
  ScriptResp,
  UserResp, ParamDefResp, PaginationInfo,
} from '@/lib/sdk'

// ---- Domain Types ----
// SDK generates all fields as optional; we enforce required ones here.

export type User = Required<UserResp>
export type Tenant = Required<TenantResp>
export type TenantUser = Required<Omit<TenantUserResp, 'user'>> & { user?: User }
export type Gateway = Required<Omit<GatewayResp, 'token'>> & { token?: string }
export type DataSourceEnv = Required<Omit<DataSourceEnvResp, 'dsn'>> & { dsn?: string }
export type DataSource = Required<Omit<DataSourceResp, 'envs'>> & { envs?: DataSourceEnv[] }
export type Project = Required<ProjectResp>
export type ParamDef = Required<Omit<ParamDefResp, 'default' | 'desc'>> & { default?: string; desc?: string }
export type ApiEndpoint = Required<Omit<ApiEndpointResp, 'description' | 'param_defs' | 'pre_script_id' | 'post_script_id'>> & { description?: string; param_defs?: ParamDef[]; pre_script_id?: number; post_script_id?: number }
export type ApiGroup = Required<Omit<ApiGroupResp, 'description'>> & { description?: string }
export type Script = Required<Omit<ScriptResp, 'description'>> & { description?: string }
export type AuthResponse = { user: User; token: string; tenant?: Tenant; tenants?: Tenant[] }
export type { PaginationInfo }

// ---- Shared Types ----

export type UserRole = 'Admin' | 'Viewer'
export type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }
export type PaginatedData<T> = { list: T[]; pagination: PaginationInfo }

// ---- Request Types ----

export type CreateTenantRequest = { name: string; slug: string; plan?: string }
export type UpdateTenantRequest = { name?: string; plan?: string; status?: string }
export type AddUserRequest = { email: string; name: string; password: string; role: UserRole }
export type UpdateUserRoleRequest = { role: UserRole }
export type CreateGatewayRequest = { name: string }
export type CreateDataSourceRequest = { name: string; type: string; is_dual?: boolean; envs: { env: string; dsn: string; gateway_id: number }[] }
export type UpdateDataSourceRequest = { name?: string; type?: string; is_dual?: boolean; envs?: { env: string; dsn: string; gateway_id: number }[] }
export type CreateProjectRequest = { name: string; description?: string }
export type UpdateProjectRequest = { name?: string; description?: string }
export type CreateEndpointRequest = { path: string; methods: string[]; sql: string; summary?: string; description?: string; datasource_id?: number; group_id?: number; pre_script_id?: number; post_script_id?: number; param_defs?: ParamDef[] }
export type UpdateEndpointRequest = Partial<CreateEndpointRequest>
export type CreateGroupRequest = { name: string; description?: string }
export type UpdateGroupRequest = { name?: string; description?: string }
export type CreateScriptRequest = { name: string; type: string; code: string; description?: string }
export type UpdateScriptRequest = Partial<CreateScriptRequest>

// ---- Token ----

export function setToken(token: string) {
  localStorage.setItem('owlapi_token', token)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `owlapi_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${secure}`
}
export function clearToken() {
  localStorage.removeItem('owlapi_token')
  document.cookie = 'owlapi_token=; path=/; max-age=0'
}
export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('owlapi_token') : null
}

// ---- 401 拦截器 ----

client.interceptors.response.use((response) => {
  if (response.status === 401) {
    clearToken()
    localStorage.removeItem('owlapi_user')
    if (typeof window !== 'undefined') {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
    }
  }
  return response
})

// ---- 内部辅助 ----
// responseTransformer 在运行时已拆除 {code,msg,data} 信封，
// SDK 类型仍是 wrapper，用此函数做类型断言。
const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

// ---- Auth ----

export const apiLogin = async (req: { email: string; password: string }): Promise<AuthResponse> => {
  const res = await cast<AuthResponse>(sdkLogin({ body: req, throwOnError: true }))
  if (res.token) setToken(res.token)
  return res
}
export const apiRegister = async (req: { email: string; name: string; password: string; tenant_name?: string; tenant_slug?: string }): Promise<AuthResponse> => {
  const res = await cast<AuthResponse>(sdkRegister({ body: req, throwOnError: true }))
  if (res.token) setToken(res.token)
  return res
}

// ---- Tenants ----

export const apiListTenants = (q: ListQuery = {}) => cast<PaginatedData<Tenant>>(myTenants({ query: q }))
export const apiGetTenant = (slug: string) => cast<Tenant>(getTenant({ path: { slug } }))
export const apiCreateTenant = (req: CreateTenantRequest) => cast<Tenant>(createTenant({ body: req }))
export const apiUpdateTenant = (slug: string, req: UpdateTenantRequest) => cast<Tenant>(updateTenant({ path: { slug }, body: req }))
export const apiDeleteTenant = (slug: string) => cast<void>(deleteTenant({ path: { slug } }))

// ---- Users ----

export const apiListUsers = (slug: string, q: ListQuery = {}) => cast<PaginatedData<TenantUser>>(listUsers({ path: { slug }, query: q }))
export const apiAddUser = (slug: string, req: AddUserRequest) => cast<void>(addUser({ path: { slug }, body: req }))
export const apiUpdateUserRole = (slug: string, userId: number, req: UpdateUserRoleRequest) => cast<void>(updateUserRole({ path: { slug, userId }, body: req }))
export const apiRemoveUser = (slug: string, userId: number) => cast<void>(removeUser({ path: { slug, userId } }))

// ---- Gateways ----

export const apiListGateways = (slug: string, q: ListQuery = {}) => cast<PaginatedData<Gateway>>(listGateways({ path: { slug }, query: q }))
export const apiCreateGateway = (slug: string, req: CreateGatewayRequest) => cast<Gateway>(createGateway({ path: { slug }, body: req }))
export const apiGetGateway = (slug: string, gatewayId: number) => cast<Gateway>(getGateway({ path: { slug, gatewayId } }))
export const apiDeleteGateway = (slug: string, gatewayId: number) => cast<void>(deleteGateway({ path: { slug, gatewayId } }))

// ---- DataSources ----

export const apiListDataSources = (slug: string, q: ListQuery = {}) => cast<PaginatedData<DataSource>>(listDataSources({ path: { slug }, query: q }))
export const apiCreateDataSource = (slug: string, req: CreateDataSourceRequest) => cast<DataSource>(createDataSource({ path: { slug }, body: req }))
export const apiGetDataSource = (slug: string, datasourceId: number) => cast<DataSource>(getDataSource({ path: { slug, datasourceId } }))
export const apiUpdateDataSource = (slug: string, datasourceId: number, req: UpdateDataSourceRequest) => cast<DataSource>(updateDataSource({ path: { slug, datasourceId }, body: req }))
export const apiDeleteDataSource = (slug: string, datasourceId: number) => cast<void>(deleteDataSource({ path: { slug, datasourceId } }))

// ---- Projects ----

export const apiListProjects = (slug: string, q: ListQuery = {}) => cast<PaginatedData<Project>>(listProjects({ path: { slug }, query: q }))
export const apiCreateProject = (slug: string, req: CreateProjectRequest) => cast<Project>(createProject({ path: { slug }, body: req }))
export const apiGetProject = (slug: string, projectId: number) => cast<Project>(getProject({ path: { slug, projectId } }))
export const apiUpdateProject = (slug: string, projectId: number, req: UpdateProjectRequest) => cast<Project>(updateProject({ path: { slug, projectId }, body: req }))
export const apiDeleteProject = (slug: string, projectId: number) => cast<void>(deleteProject({ path: { slug, projectId } }))

// ---- Endpoints ----

export const apiListEndpoints = (slug: string, projectId: number, q: ListQuery = {}) => cast<PaginatedData<ApiEndpoint>>(listEndpoints({ path: { slug, projectId }, query: q }))
export const apiCreateEndpoint = (slug: string, projectId: number, req: CreateEndpointRequest) => cast<ApiEndpoint>(createEndpoint({ path: { slug, projectId }, body: req }))
export const apiUpdateEndpoint = (slug: string, projectId: number, endpointId: number, req: UpdateEndpointRequest) => cast<ApiEndpoint>(updateEndpoint({ path: { slug, projectId, endpointId }, body: req }))
export const apiDeleteEndpoint = (slug: string, projectId: number, endpointId: number) => cast<void>(deleteEndpoint({ path: { slug, projectId, endpointId } }))

// ---- Groups ----

export const apiListGroups = (slug: string, projectId: number, q: ListQuery = {}) => cast<PaginatedData<ApiGroup>>(listGroups({ path: { slug, projectId }, query: q }))
export const apiCreateGroup = (slug: string, projectId: number, req: CreateGroupRequest) => cast<ApiGroup>(createGroup({ path: { slug, projectId }, body: req }))
export const apiUpdateGroup = (slug: string, projectId: number, groupId: number, req: UpdateGroupRequest) => cast<ApiGroup>(updateGroup({ path: { slug, projectId, groupId }, body: req }))
export const apiDeleteGroup = (slug: string, projectId: number, groupId: number) => cast<void>(deleteGroup({ path: { slug, projectId, groupId } }))

// ---- Scripts ----

export const apiListScripts = (slug: string, q: ListQuery = {}) => cast<PaginatedData<Script>>(listScripts({ path: { slug }, query: q }))
export const apiCreateScript = (slug: string, req: CreateScriptRequest) => cast<Script>(createScript({ path: { slug }, body: req }))
export const apiUpdateScript = (slug: string, scriptId: number, req: UpdateScriptRequest) => cast<Script>(updateScript({ path: { slug, scriptId }, body: req }))
export const apiDeleteScript = (slug: string, scriptId: number) => cast<void>(deleteScript({ path: { slug, scriptId } }))

// ---- Query & Export ----

export const apiTestQuery = (slug: string, endpointId: number, params: Record<string, string>, ignoreScripts = false) =>
  cast<Record<string, unknown>>(testQuery({ path: { slug }, body: { endpoint_id: endpointId, params, ignore_scripts: ignoreScripts } }))

export const apiExportOpenAPI = async (slug: string, projectId: number): Promise<void> => {
  if (typeof window === 'undefined') return
  const spec = await cast<Record<string, unknown>>(exportOpenApi({ path: { slug, projectId } }))
  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'openapi.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
