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
  AuthResponse, Tenant, TenantUser, User,
  ApiEndpoint, ApiGroup, DataSource, DataSourceEnv, Project, Script, Gateway,
  CreateTenantRequest, UpdateTenantRequest, AddUserRequest,
  CreateDataSourceRequest, UpdateDataSourceRequest,
  CreateProjectRequest, UpdateProjectRequest,
  CreateEndpointRequest, UpdateApiEndpointRequest,
  CreateGroupRequest, UpdateApiGroupRequest,
  CreateScriptRequest, UpdateScriptRequest,
  CreateGatewayResponse,
} from '@/lib/sdk'

export type {
  AuthResponse, Tenant, TenantUser, User,
  ApiEndpoint, ApiGroup, DataSource, DataSourceEnv, Project, Script, Gateway,
  CreateTenantRequest, UpdateTenantRequest,
  CreateGatewayResponse,
}

export type { ListData }

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

// ---- 类型化辅助 ----

type ListData<T> = { list: T[]; total: number }
type PaginatedData<T> = { list: T[]; pagination: { is_pager: number; page: number; size: number; total: number } }

async function d<T>(p: Promise<{ data?: unknown }>): Promise<T> {
  return (await p).data as T
}

// ---- Auth ----

export async function apiLogin(req: { email: string; password: string }): Promise<AuthResponse> {
  const res = await d<AuthResponse>(sdkLogin({ body: req, throwOnError: true }))
  if (res.token) setToken(res.token)
  return res
}
export async function apiRegister(req: { email: string; name: string; password: string; tenant_name?: string; tenant_slug?: string }): Promise<AuthResponse> {
  const res = await d<AuthResponse>(sdkRegister({ body: req, throwOnError: true }))
  if (res.token) setToken(res.token)
  return res
}

// ---- Tenants ----

export const apiListTenants = (page = 1, size = 20) => d<PaginatedData<Tenant>>(myTenants({ query: { page, size } }))
export const apiGetTenant = (slug: string) => d<Tenant>(getTenant({ path: { slug } }))
export const apiCreateTenant = (req: CreateTenantRequest) => d<Tenant>(createTenant({ body: req }))
export const apiUpdateTenant = (slug: string, data: UpdateTenantRequest) => d<Tenant>(updateTenant({ path: { slug }, body: data }))
export const apiDeleteTenant = (slug: string) => d<void>(deleteTenant({ path: { slug } }))

// ---- Users ----

export const apiListUsers = (slug: string, page = 1, size = 10) => d<PaginatedData<TenantUser>>(listUsers({ path: { slug }, query: { page, size } }))
export const apiAddUser = (slug: string, req: AddUserRequest) => d<void>(addUser({ path: { slug }, body: req }))
export const apiUpdateUserRole = (slug: string, userId: number, role: string) => d<void>(updateUserRole({ path: { slug, userId }, body: { role: role as 'Admin' | 'Viewer' } }))
export const apiRemoveUser = (slug: string, userId: number) => d<void>(removeUser({ path: { slug, userId } }))

// ---- Gateways ----

export const apiListGateways = (slug: string) => d<ListData<Gateway>>(listGateways({ path: { slug } }))
export const apiCreateGateway = (slug: string, name: string) => d<CreateGatewayResponse>(createGateway({ path: { slug }, body: { name } }))
export const apiGetGateway = (slug: string, gatewayId: number) => d<Gateway>(getGateway({ path: { slug, gatewayId } }))
export const apiDeleteGateway = (slug: string, gatewayId: number) => d<void>(deleteGateway({ path: { slug, gatewayId } }))

// ---- DataSources ----

export const apiListDataSources = (slug: string) => d<ListData<DataSource>>(listDataSources({ path: { slug } }))
export const apiCreateDataSource = (slug: string, req: CreateDataSourceRequest) => d<DataSource>(createDataSource({ path: { slug }, body: req }))
export const apiGetDataSource = (slug: string, datasourceId: number) => d<DataSource>(getDataSource({ path: { slug, datasourceId } }))
export const apiDeleteDataSource = (slug: string, datasourceId: number) => d<void>(deleteDataSource({ path: { slug, datasourceId } }))
export const apiUpdateDataSource = (slug: string, datasourceId: number, req: UpdateDataSourceRequest) => d<DataSource>(updateDataSource({ path: { slug, datasourceId }, body: req }))

// ---- Projects ----

export const apiListProjects = (slug: string) => d<ListData<Project>>(listProjects({ path: { slug } }))
export const apiCreateProject = (slug: string, req: CreateProjectRequest) => d<Project>(createProject({ path: { slug }, body: req }))
export const apiGetProject = (slug: string, projectId: number) => d<Project>(getProject({ path: { slug, projectId } }))
export const apiUpdateProject = (slug: string, projectId: number, req: UpdateProjectRequest) => d<Project>(updateProject({ path: { slug, projectId }, body: req }))
export const apiDeleteProject = (slug: string, projectId: number) => d<void>(deleteProject({ path: { slug, projectId } }))

// ---- Endpoints ----

export const apiListEndpoints = (slug: string, projectId: number) => d<ListData<ApiEndpoint>>(listEndpoints({ path: { slug, projectId } }))
export const apiCreateEndpoint = (slug: string, projectId: number, req: CreateEndpointRequest) => d<ApiEndpoint>(createEndpoint({ path: { slug, projectId }, body: req }))
export const apiUpdateEndpoint = (slug: string, projectId: number, endpointId: number, req: UpdateApiEndpointRequest) => d<ApiEndpoint>(updateEndpoint({ path: { slug, projectId, endpointId }, body: req }))
export const apiDeleteEndpoint = (slug: string, projectId: number, endpointId: number) => d<void>(deleteEndpoint({ path: { slug, projectId, endpointId } }))

// ---- Groups ----

export const apiListGroups = (slug: string, projectId: number) => d<ListData<ApiGroup>>(listGroups({ path: { slug, projectId } }))
export const apiCreateGroup = (slug: string, projectId: number, req: CreateGroupRequest) => d<ApiGroup>(createGroup({ path: { slug, projectId }, body: req }))
export const apiUpdateGroup = (slug: string, projectId: number, groupId: number, req: UpdateApiGroupRequest) => d<ApiGroup>(updateGroup({ path: { slug, projectId, groupId }, body: req }))
export const apiDeleteGroup = (slug: string, projectId: number, groupId: number) => d<void>(deleteGroup({ path: { slug, projectId, groupId } }))

// ---- Scripts ----

export const apiListScripts = (slug: string) => d<ListData<Script>>(listScripts({ path: { slug } }))
export const apiCreateScript = (slug: string, req: CreateScriptRequest) => d<Script>(createScript({ path: { slug }, body: req }))
export const apiUpdateScript = (slug: string, scriptId: number, req: UpdateScriptRequest) => d<Script>(updateScript({ path: { slug, scriptId }, body: req }))
export const apiDeleteScript = (slug: string, scriptId: number) => d<void>(deleteScript({ path: { slug, scriptId } }))

// ---- Query & Export ----

export const apiTestQuery = (slug: string, endpointId: number, params: Record<string, string>, ignoreScripts = false) =>
  d<unknown>(testQuery({ path: { slug }, body: { endpoint_id: endpointId, params, ignore_scripts: ignoreScripts } }))

export async function apiExportOpenAPI(slug: string, projectId: number): Promise<void> {
  if (typeof window === 'undefined') return
  const spec = await d<Record<string, unknown>>(exportOpenApi({ path: { slug, projectId } }))
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
