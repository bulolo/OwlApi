"use client"

import { create } from "zustand"
import { toast } from "sonner"
import { format as formatSql } from "sql-formatter"
import { createEndpoint, updateEndpoint, getListEndpointsQueryKey } from "@/lib/sdk"
import type { APIEndpointResp as ApiEndpoint, EndpointVersionResp as EndpointVersion } from "@/lib/sdk"
import { apiRun, apiRunSQL } from "@/lib/query"
import { queryClient } from "@/lib/queryClient"
import { getErrorMessage } from "@/lib/errors"
import { PARAM_PLACEHOLDER_PREFIX } from "@/lib/constants"
import type { HttpMethod, ParamDef, ResponseDef, ExecutionResult, EndpointFormState, ScriptStep, ScriptStepSource } from "../_types"

// SDK 用 snake_case(script_id)，表单用 camelCase(scriptId)，双向映射。
type SdkScriptStep = { source?: string; script_id?: number; name?: string; code?: string }
function stepsFromSdk(steps?: SdkScriptStep[]): ScriptStep[] {
  return (steps || []).map(s => ({
    source: (s.source as ScriptStepSource) ?? "library",
    scriptId: s.script_id,
    name: s.name,
    code: s.code,
  }))
}
function stepsToSdk(steps: ScriptStep[]): SdkScriptStep[] {
  return steps.map(s => s.source === "inline"
    ? { source: "inline", name: s.name ?? "", code: s.code ?? "" }
    : { source: "library", script_id: s.scriptId ?? 0 })
}

export const SQL_TEMPLATES: Record<HttpMethod, string> = {
  GET:    "SELECT *\nFROM table_name\nWHERE id = :id",
  POST:   "INSERT INTO table_name (column1, column2)\nVALUES (:value1, :value2)",
  PUT:    "UPDATE table_name\nSET column1 = :value1\nWHERE id = :id",
  DELETE: "DELETE FROM table_name\nWHERE id = :id",
}

function buildParamJSON(paramDefs: ParamDef[]): string {
  if (paramDefs.length === 0) return "{}"
  const obj: Record<string, string> = {}
  for (const p of paramDefs) obj[p.name] = p.default ?? ""
  return JSON.stringify(obj, null, 2)
}

function epToForm(ep: ApiEndpoint, defaultHandle = "main"): EndpointFormState {
  return {
    path: ep.path ?? "",
    method: (ep.method ?? "POST") as HttpMethod,
    summary: ep.summary ?? "",
    sql: ep.sql ?? "",
    datasourceAlias: ep.datasource_alias || defaultHandle,
    groupId: ep.group_id || 0,
    preScripts: stepsFromSdk(ep.pre_scripts),
    postScripts: stepsFromSdk(ep.post_scripts),
    paramDefs: (ep.param_defs || []) as ParamDef[],
    responseDefs: (ep.response_defs || []) as ResponseDef[],
    paramInput: "",
  }
}

const initialForm: EndpointFormState = {
  path: "",
  method: "GET",
  summary: "",
  sql: "",
  datasourceAlias: "main",
  groupId: 0,
  preScripts: [],
  postScripts: [],
  paramDefs: [],
  responseDefs: [],
  paramInput: "",
}

export interface RestoredFromVersion {
  versionId: number
  version: number
  createdAt: string
}

interface FormState {
  form: EndpointFormState
  _savedForm: EndpointFormState
  _loadedEndpointId: number | null
  isDirty: boolean
  saving: boolean
  authToken: string
  paramJSON: string
  executing: boolean
  execResult: ExecutionResult
  designExecuting: boolean
  designExecResult: ExecutionResult
  restoredFromVersion: RestoredFromVersion | null
  _preRestoreForm: EndpointFormState | null
}

interface FormActions {
  initForm: (ep: ApiEndpoint | null, defaultHandle?: string, initialMethod?: HttpMethod) => void
  setFormField: <K extends keyof EndpointFormState>(key: K, value: EndpointFormState[K]) => void
  setParamDefs: (updater: ParamDef[] | ((prev: ParamDef[]) => ParamDef[])) => void
  syncParamDefs: (updater: ParamDef[] | ((prev: ParamDef[]) => ParamDef[])) => void
  setResponseDefs: (defs: ResponseDef[]) => void

  save: (tenant: string, projectId: string, isNew: boolean, selectedId: number | null) => Promise<ApiEndpoint | null>

  runDebug: (tenant: string, envId: number, selectedId: number) => Promise<void>
  runDesign: (tenant: string, projectId: string, envId: number, selectedId: number | null, isNew: boolean) => Promise<void>

  formatSQL: () => void
  restoreFromVersion: (version: EndpointVersion) => void
  undoRestore: () => void
  clearRestoredBanner: () => void
  revertToSaved: () => void

  setAuthToken: (token: string) => void
  setParamJSON: (json: string) => void
  setExecResult: (r: ExecutionResult) => void
  setDesignExecResult: (r: ExecutionResult) => void
}

export type EndpointFormStore = FormState & FormActions

export const useEndpointFormStore = create<EndpointFormStore>((set, get) => ({
  form: { ...initialForm },
  _savedForm: { ...initialForm },
  _loadedEndpointId: null,
  isDirty: false,
  saving: false,
  authToken: "",
  paramJSON: "{}",
  executing: false,
  execResult: null,
  designExecuting: false,
  designExecResult: null,
  restoredFromVersion: null,
  _preRestoreForm: null,

  initForm: (ep, defaultHandle = "main", initialMethod?) => {
    const prevForm = get().form
    const isSameEndpoint = ep != null && get()._loadedEndpointId === ep.id
    const form = ep
      ? epToForm(ep, defaultHandle)
      : {
          ...initialForm,
          datasourceAlias: defaultHandle,
          ...(initialMethod && { method: initialMethod, sql: SQL_TEMPLATES[initialMethod] }),
        }
    // When re-loading the same endpoint and the server doesn't return response_defs
    // (e.g. backend running old binary, or omitempty dropped empty array), preserve
    // whatever the current form has so the user's extracted fields survive the refetch.
    if (isSameEndpoint && form.responseDefs.length === 0 && prevForm.responseDefs.length > 0) {
      form.responseDefs = prevForm.responseDefs
    }
    set({
      form,
      _savedForm: { ...form },
      _loadedEndpointId: ep?.id ?? null,
      isDirty: false,
      paramJSON: buildParamJSON(form.paramDefs),
      execResult: null,
      // Keep design result when refreshing the same endpoint (e.g. after auto-save invalidates the list).
      // Clear it only when switching to a different endpoint.
      ...(!isSameEndpoint && { designExecResult: null }),
      restoredFromVersion: null,
      _preRestoreForm: null,
    })
  },

  setFormField: (key, value) =>
    set((s) => {
      const newForm = { ...s.form, [key]: value }
      const extra: Partial<FormState> = {}
      if (key === "paramDefs") extra.paramJSON = buildParamJSON(value as ParamDef[])
      return { form: newForm, isDirty: true, ...extra }
    }),

  setParamDefs: (updater) =>
    set((s) => {
      const newDefs = typeof updater === "function" ? updater(s.form.paramDefs) : updater
      return {
        form: { ...s.form, paramDefs: newDefs },
        paramJSON: buildParamJSON(newDefs),
        isDirty: true,
      }
    }),

  syncParamDefs: (updater) =>
    set((s) => {
      const newDefs = typeof updater === "function" ? updater(s.form.paramDefs) : updater
      // 无变化时返回原 state，避免新建 form 触发无限 re-render（useParamSync 在无新增时回传原数组）。
      if (newDefs === s.form.paramDefs) return s
      return {
        form: { ...s.form, paramDefs: newDefs },
        paramJSON: buildParamJSON(newDefs),
      }
    }),

  setResponseDefs: (defs) =>
    set((s) => ({ form: { ...s.form, responseDefs: defs }, isDirty: true })),

  save: async (tenant, projectId, isNew, selectedId) => {
    const { form } = get()
    if (!form.path.trim()) {
      toast.error("请填写接口路径")
      return null
    }
    if (!form.path.trim().startsWith("/")) {
      toast.error("路径必须以 / 开头")
      return null
    }
    if (!form.method) {
      toast.error("请选择请求方法")
      return null
    }
    if (!form.sql.trim()) {
      toast.error("请填写 SQL")
      return null
    }
    const payload = {
      path: form.path,
      method: form.method,
      summary: form.summary,
      sql: form.sql,
      param_defs: form.paramDefs,
      response_defs: form.responseDefs,
      datasource_alias: form.datasourceAlias,
      group_id: form.groupId,
      pre_scripts: stepsToSdk(form.preScripts),
      post_scripts: stepsToSdk(form.postScripts),
    }
    set({ saving: true })
    try {
      let saved: ApiEndpoint
      if (isNew) {
        saved = await createEndpoint(tenant, Number(projectId), payload) as ApiEndpoint
        toast.success("接口创建成功")
      } else if (selectedId) {
        saved = await updateEndpoint(tenant, Number(projectId), selectedId, payload) as ApiEndpoint
        toast.success("接口已保存")
      } else {
        return null
      }
      set({ _savedForm: { ...form }, isDirty: false })
      queryClient.invalidateQueries({ queryKey: getListEndpointsQueryKey(tenant, Number(projectId)) })
      return saved
    } catch (err) {
      toast.error("保存失败", { description: getErrorMessage(err) })
      return null
    } finally {
      set({ saving: false })
    }
  },

  runDebug: async (tenant, envId, selectedId) => {
    const { paramJSON, form } = get()
    set({ executing: true, execResult: null })
    try {
      let params: Record<string, string> = {}
      try {
        params = JSON.parse(paramJSON)
      } catch {
        toast.error("参数 JSON 格式错误")
        set({ executing: false })
        return
      }
      for (const def of form.paramDefs) {
        if (def.name && !(def.name in params) && def.default) params[def.name] = def.default
      }
      const data = await apiRun(tenant, selectedId, envId, params)
      set({ execResult: data as ExecutionResult })
    } catch (err) {
      set({ execResult: { error: getErrorMessage(err) } })
    } finally {
      set({ executing: false })
    }
  },

  runDesign: async (tenant, projectId, envId, selectedId, isNew) => {
    if (isNew || !selectedId) {
      toast.error("请先保存接口再执行")
      return
    }
    const { form, paramJSON } = get()
    if (!form.datasourceAlias) {
      set({ designExecResult: { error: "请先选择数据源别名" } })
      return
    }
    if (!form.sql.trim()) {
      set({ designExecResult: { error: "请先填写 SQL" } })
      return
    }
    set({ designExecuting: true, designExecResult: null })
    try {
      let params: Record<string, string> = {}
      try { params = JSON.parse(paramJSON) } catch { /* ignore */ }
      for (const def of form.paramDefs) {
        if (def.name && !(def.name in params) && def.default) params[def.name] = def.default
      }
      const data = await apiRunSQL(tenant, Number(projectId), form.sql, form.datasourceAlias, envId, params)
      set({ designExecResult: data as ExecutionResult })
    } catch (err) {
      set({ designExecResult: { error: getErrorMessage(err) } })
    } finally {
      set({ designExecuting: false })
    }
  },

  formatSQL: () => {
    try {
      const { form } = get()
      const paramsArr: string[] = []
      let sql = form.sql.replace(/:([a-zA-Z_]\w*)/g, (_, name: string) => {
        paramsArr.push(name)
        return `${PARAM_PLACEHOLDER_PREFIX}${paramsArr.length - 1}__`
      })
      sql = formatSql(sql, { language: "postgresql", keywordCase: "upper" })
      sql = sql.replace(
        new RegExp(`${PARAM_PLACEHOLDER_PREFIX}(\\d+)__`, "g"),
        (_, i: string) => `:${paramsArr[Number(i)]}`
      )
      set((s) => ({ form: { ...s.form, sql }, isDirty: true }))
    } catch {
      // ignore
    }
  },

  restoreFromVersion: (version) => {
    const snap = version.snapshot
    if (!snap) return
    const paramDefs = (snap.param_defs || []) as ParamDef[]
    const responseDefs = (snap.response_defs || []) as ResponseDef[]
    set((s) => {
      const nextForm: EndpointFormState = {
        ...s.form,
        ...(snap.sql !== undefined && { sql: snap.sql }),
        ...(snap.path !== undefined && { path: snap.path }),
        ...(snap.method && { method: snap.method as HttpMethod }),
        ...(snap.datasource_alias && { datasourceAlias: snap.datasource_alias }),
        paramDefs,
        responseDefs,
      }
      return {
        _preRestoreForm: s._preRestoreForm ?? { ...s.form },
        form: nextForm,
        paramJSON: buildParamJSON(paramDefs),
        isDirty: true,
        restoredFromVersion: {
          versionId: version.id,
          version: version.version,
          createdAt: version.created_at,
        },
      }
    })
  },

  undoRestore: () => {
    set((s) => {
      const target = s._preRestoreForm
      if (!target) return s
      return {
        form: { ...target },
        paramJSON: buildParamJSON(target.paramDefs),
        isDirty: JSON.stringify(target) !== JSON.stringify(s._savedForm),
        restoredFromVersion: null,
        _preRestoreForm: null,
      }
    })
  },

  clearRestoredBanner: () => set({ restoredFromVersion: null, _preRestoreForm: null }),

  revertToSaved: () => set(s => ({
    form: { ...s._savedForm },
    paramJSON: buildParamJSON(s._savedForm.paramDefs),
    isDirty: false,
    restoredFromVersion: null,
    _preRestoreForm: null,
  })),

  setAuthToken: (token) => set({ authToken: token }),
  setParamJSON: (json) => set({ paramJSON: json }),
  setExecResult: (r) => set({ execResult: r }),
  setDesignExecResult: (r) => set({ designExecResult: r }),
}))
