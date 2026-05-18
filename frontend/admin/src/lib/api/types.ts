import type {
  TenantResp, TenantUserResp,
  GatewayResp,
  DataSourceResp,
  ProjectResp,
  ApiEndpointResp,
  ApiGroupResp,
  ScriptResp,
  UserResp, ParamDefResp, PaginationInfo,
  AuthResp,
  EndpointEnvActivityResp,
} from '@/lib/sdk'

// ── Domain Types — direct re-exports from SDK ──

export type User = UserResp
export type Tenant = TenantResp
export type TenantUser = TenantUserResp
export type Gateway = GatewayResp
export type DataSource = DataSourceResp
export type Project = ProjectResp
export type ParamDef = ParamDefResp
export type ApiEndpoint = ApiEndpointResp
export type ApiGroup = ApiGroupResp
export type Script = ScriptResp
export type AuthResponse = AuthResp
export type EndpointEnvActivity = EndpointEnvActivityResp
export type { PaginationInfo }

// ── Environment-layer types (not in SDK because handlers use loose {object} R) ──

export type ProjectEnvironment = {
  id: number
  tenant_id: number
  project_id: number
  name: string
  is_default: boolean
  created_at: string
}

export type EndpointDatasourceBinding = {
  tenant_id: number
  env_id: number
  alias: string
  datasource_id: number
}

// ── Shared Types ──

export type UserRole = 'Admin' | 'Viewer'
export type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }
export type PaginatedData<T> = { list: T[]; pagination: PaginationInfo }

// ── Request Types ──

export type CreateTenantRequest = { name: string; slug: string; plan?: string }
export type UpdateTenantRequest = { name?: string; plan?: string; status?: string; max_release_versions?: number }
export type AddUserRequest = { email: string; name: string; password: string; role: UserRole }
export type UpdateUserRoleRequest = { role: UserRole }
export type CreateGatewayRequest = { name: string }
export type DataSourceType = "mysql" | "postgres" | "sqlserver" | "starrocks" | "doris" | "sqlite"
export type CreateDataSourceRequest = { name: string; type: DataSourceType; dsn: string; gateway_id: number }
export type UpdateDataSourceRequest = { name?: string; type?: DataSourceType; dsn?: string; gateway_id?: number }
export type CreateProjectRequest = { slug: string; name: string; description?: string }
export type UpdateProjectRequest = { slug?: string; name?: string; description?: string }
export type CreateEndpointRequest = { path: string; methods: string[]; sql: string; summary?: string; description?: string; datasource_alias?: string; group_id?: number; pre_script_id?: number; post_script_id?: number; param_defs?: ParamDef[] }
export type UpdateEndpointRequest = Partial<CreateEndpointRequest>
export type CreateGroupRequest = { name: string; description?: string }
export type UpdateGroupRequest = { name?: string; description?: string }
export type CreateScriptRequest = { name: string; type: string; code: string; description?: string }
export type UpdateScriptRequest = Partial<CreateScriptRequest>
export type CreateEnvironmentRequest = { name: string; is_default?: boolean; copy_from_env_id?: number; copy_bindings?: boolean }
export type RenameEnvironmentRequest = { name: string }
export type UpsertBindingRequest = { alias: string; datasource_id: number }
export type RenameAliasRequest = { old_alias: string; new_alias: string }
export type PromoteRequest = { source_env_id: number; target_env_id: number }
