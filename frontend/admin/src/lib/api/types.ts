import type {
  TenantResp, TenantUserResp,
  GatewayResp,
  DataSourceResp, DataSourceEnvResp,
  ProjectResp,
  ApiEndpointResp,
  ApiGroupResp,
  ScriptResp,
  UserResp, ParamDefResp, PaginationInfo,
  AuthResp,
} from '@/lib/sdk'

// ── Domain Types — direct re-exports from SDK ──
// Fields are non-optional because the backend DTOs are annotated with validate:"required".
// Do not add manual Required<> wrappers here; fix the source (dto.go) instead.

export type User = UserResp
export type Tenant = TenantResp
export type TenantUser = TenantUserResp
export type Gateway = GatewayResp
export type DataSourceEnv = DataSourceEnvResp
export type DataSource = DataSourceResp
export type Project = ProjectResp
export type ParamDef = ParamDefResp
export type ApiEndpoint = ApiEndpointResp
export type ApiGroup = ApiGroupResp
export type Script = ScriptResp
export type AuthResponse = AuthResp
export type { PaginationInfo }

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
export type DataSourceEnvName = "dev" | "prod"
export type CreateDataSourceRequest = { name: string; type: DataSourceType; is_dual?: boolean; envs: { env: DataSourceEnvName; dsn: string; gateway_id: number }[] }
export type UpdateDataSourceRequest = { name?: string; type?: DataSourceType; is_dual?: boolean; envs?: { env: DataSourceEnvName; dsn: string; gateway_id: number }[] }
export type CreateProjectRequest = { slug: string; name: string; description?: string }
export type UpdateProjectRequest = { slug?: string; name?: string; description?: string }
export type CreateEndpointRequest = { path: string; methods: string[]; sql: string; summary?: string; description?: string; datasource_id?: number; group_id?: number; pre_script_id?: number; post_script_id?: number; param_defs?: ParamDef[] }
export type UpdateEndpointRequest = Partial<CreateEndpointRequest>
export type CreateGroupRequest = { name: string; description?: string }
export type UpdateGroupRequest = { name?: string; description?: string }
export type CreateScriptRequest = { name: string; type: string; code: string; description?: string }
export type UpdateScriptRequest = Partial<CreateScriptRequest>
