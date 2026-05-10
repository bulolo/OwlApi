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

// ── Domain Types ──

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

// ── Shared Types ──

export type UserRole = 'Admin' | 'Viewer'
export type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }
export type PaginatedData<T> = { list: T[]; pagination: PaginationInfo }

// ── Request Types ──

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
