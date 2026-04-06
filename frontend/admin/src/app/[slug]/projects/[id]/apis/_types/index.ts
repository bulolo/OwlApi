/**
 * API 管理模块 — 完整类型定义
 */
import type { ApiEndpoint, DataSource, Script, ApiGroup } from "@/lib/api-client"

// ── Re-exports ──
export type { ApiEndpoint, DataSource, Script, ApiGroup }

// ── HTTP ──
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

// ── Tab 导航 ──
export type ActiveTab = "design" | "run" | "doc" | "settings" | "logs"

// ── 参数 ──
export type ParamType = "string" | "integer" | "number" | "boolean"
export type ParamSource = "sql" | "script" | "manual"

export interface ParamDef {
  name: string
  type: ParamType
  required: boolean
  default?: string
  desc?: string
}

/** 带来源标记的扩展参数定义，用于 UI 展示 */
export interface DerivedParamDef extends ParamDef {
  _isAuto: boolean
  _source: ParamSource
}

// ── 执行结果 ──
export interface ExecutionSuccess {
  data?: unknown
  list?: unknown[]
  [key: string]: unknown
}

export interface ExecutionError {
  error: string
}

export interface ExecutionSuccessMessage {
  success: string
}

export type ExecutionResult = ExecutionSuccess | ExecutionError | ExecutionSuccessMessage | null

/** 类型守卫 */
export function isExecutionError(r: ExecutionResult): r is ExecutionError {
  return r !== null && typeof r === "object" && "error" in r
}

export function isExecutionSuccess(r: ExecutionResult): r is ExecutionSuccessMessage {
  return r !== null && typeof r === "object" && "success" in r
}

// ── Endpoint 表单状态 ──
export interface EndpointFormState {
  path: string
  method: HttpMethod
  sql: string
  datasourceId: number
  groupId: number
  preScriptId: number
  postScriptId: number
  paramDefs: ParamDef[]
  paramInput: string
}

// ── 分组 Modal ──
export type GroupModalMode = "create" | "edit"

export interface GroupModalState {
  open: boolean
  mode: GroupModalMode
  name: string
  editingGroupId: number | null
}
