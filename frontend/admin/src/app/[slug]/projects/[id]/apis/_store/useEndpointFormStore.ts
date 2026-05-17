"use client"

import { create } from "zustand"
import { toast } from "sonner"
import { format as formatSql } from "sql-formatter"
import {
  apiCreateEndpoint,
  apiUpdateEndpoint,
  apiRun,
  type ApiEndpoint,
  type EndpointVersion,
} from "@/lib/api-client"
import { queryClient } from "@/lib/queryClient"
import { getErrorMessage } from "@/lib/errors"
import { PARAM_PLACEHOLDER_PREFIX } from "@/lib/constants"
import type { HttpMethod, ParamDef, ExecutionResult, EndpointFormState } from "../_types"

// ── SQL 初始模板（按 HTTP 方法对应 REST 语义）──
export const SQL_TEMPLATES: Record<HttpMethod, string> = {
  GET:    "SELECT *\nFROM table_name\nWHERE id = :id",
  POST:   "INSERT INTO table_name (column1, column2)\nVALUES (:value1, :value2)",
  PUT:    "UPDATE table_name\nSET column1 = :value1\nWHERE id = :id",
  DELETE: "DELETE FROM table_name\nWHERE id = :id",
}

// ── Helpers ──

function buildParamJSON(paramDefs: ParamDef[]): string {
  if (paramDefs.length === 0) return "{}"
  const obj: Record<string, string> = {}
  for (const p of paramDefs) obj[p.name] = p.default ?? ""
  return JSON.stringify(obj, null, 2)
}

function epToForm(ep: ApiEndpoint, defaultDatasourceId = 0): EndpointFormState {
  return {
    path: ep.path ?? "",
    method: (ep.methods?.[0] ?? "POST") as HttpMethod,
    summary: ep.summary ?? "",
    sql: ep.sql ?? "",
    datasourceId: ep.datasource_id || defaultDatasourceId,
    groupId: ep.group_id || 0,
    preScriptId: ep.pre_script_id || 0,
    postScriptId: ep.post_script_id || 0,
    paramDefs: (ep.param_defs || []) as ParamDef[],
    paramInput: "",
  }
}

const initialForm: EndpointFormState = {
  path: "",
  method: "POST",
  summary: "",
  sql: "",
  datasourceId: 0,
  groupId: 0,
  preScriptId: 0,
  postScriptId: 0,
  paramDefs: [],
  paramInput: "",
}

// ── Store ──

/** 当编辑器内容来自某个历史版本时记录的"来源"信息，用于在设计 Tab 顶部展示告示条。 */
export interface RestoredFromVersion {
  versionId: number
  version: number
  createdAt: string
}

interface FormState {
  form: EndpointFormState
  _savedForm: EndpointFormState
  isDirty: boolean
  saving: boolean
  authToken: string
  paramJSON: string
  executing: boolean
  execResult: ExecutionResult
  designExecuting: boolean
  designExecResult: ExecutionResult
  /** 当前编辑内容是否来自某个历史版本的复制（用于显示提示条）。 */
  restoredFromVersion: RestoredFromVersion | null
  /** 复制前的表单状态，用于「撤销」回到复制前。 */
  _preRestoreForm: EndpointFormState | null
}

interface FormActions {
  initForm: (ep: ApiEndpoint | null, defaultDatasourceId?: number, initialMethod?: HttpMethod) => void
  setFormField: <K extends keyof EndpointFormState>(key: K, value: EndpointFormState[K]) => void
  setParamDefs: (updater: ParamDef[] | ((prev: ParamDef[]) => ParamDef[])) => void
  /** 仅用于 useParamSync 自动同步，不触发 isDirty */
  syncParamDefs: (updater: ParamDef[] | ((prev: ParamDef[]) => ParamDef[])) => void

  // returns saved endpoint or null on failure
  save: (tenant: string, projectId: string, isNew: boolean, selectedId: number | null) => Promise<ApiEndpoint | null>

  runDebug: (tenant: string, selectedId: number) => Promise<void>
  runDesign: (tenant: string, projectId: string, selectedId: number | null, isNew: boolean) => Promise<void>

  formatSQL: () => void
  /** 把某个历史版本的内容复制到当前编辑器（不会修改线上）。会记录来源 + 复制前快照以便撤销。 */
  restoreFromVersion: (version: EndpointVersion) => void
  /** 撤销 restoreFromVersion，回到复制前的草稿状态。 */
  undoRestore: () => void
  /** 保留当前表单，但清除"基于某版本编辑"的标记（用于发布/创建版本成功后）。 */
  clearRestoredBanner: () => void
  /** 丢弃所有未保存的修改，把表单恢复到上次保存的状态。 */
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

  initForm: (ep, defaultDatasourceId = 0, initialMethod?) => {
    const form = ep
      ? epToForm(ep, defaultDatasourceId)
      : {
          ...initialForm,
          datasourceId: defaultDatasourceId,
          ...(initialMethod && { method: initialMethod, sql: SQL_TEMPLATES[initialMethod] }),
        }
    set({
      form,
      _savedForm: { ...form },
      isDirty: false,
      paramJSON: buildParamJSON(form.paramDefs),
      execResult: null,
      designExecResult: null,
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
      return {
        form: { ...s.form, paramDefs: newDefs },
        paramJSON: buildParamJSON(newDefs),
        // isDirty intentionally not changed
      }
    }),

  save: async (tenant, projectId, isNew, selectedId) => {
    const { form } = get()
    if (!form.path || !form.sql) {
      toast.error("请填写路径和 SQL")
      return null
    }
    const payload = {
      path: form.path,
      methods: [form.method],
      summary: form.summary,
      sql: form.sql,
      params: form.paramDefs.map((d) => d.name).filter(Boolean),
      param_defs: form.paramDefs,
      datasource_id: form.datasourceId,
      group_id: form.groupId,
      pre_script_id: form.preScriptId,
      post_script_id: form.postScriptId,
    }
    set({ saving: true })
    try {
      let saved: ApiEndpoint
      if (isNew) {
        saved = await apiCreateEndpoint(tenant, Number(projectId), payload)
        toast.success("接口创建成功")
      } else if (selectedId) {
        saved = await apiUpdateEndpoint(tenant, Number(projectId), selectedId, payload)
        toast.success("接口已保存")
      } else {
        return null
      }
      set({ _savedForm: { ...form }, isDirty: false })
      queryClient.invalidateQueries({ queryKey: ["endpoints", tenant, projectId] })
      return saved
    } catch (err) {
      toast.error("保存失败", { description: getErrorMessage(err) })
      return null
    } finally {
      set({ saving: false })
    }
  },

  runDebug: async (tenant, selectedId) => {
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
      const data = await apiRun(tenant, selectedId, params)
      set({ execResult: data as ExecutionResult })
    } catch (err) {
      set({ execResult: { error: getErrorMessage(err) } })
    } finally {
      set({ executing: false })
    }
  },

  runDesign: async (tenant, projectId, selectedId, isNew) => {
    if (isNew || !selectedId) {
      toast.error("请先保存接口再执行")
      return
    }
    const { form, paramJSON } = get()
    if (!form.datasourceId) {
      set({ designExecResult: { error: "请先选择数据源" } })
      return
    }
    if (!form.sql.trim()) {
      set({ designExecResult: { error: "请先填写 SQL" } })
      return
    }
    set({ designExecuting: true, designExecResult: null })
    try {
      // Auto-save draft so the executed SQL matches what's on screen
      await apiUpdateEndpoint(tenant, Number(projectId), selectedId, {
        path: form.path,
        methods: [form.method],
        sql: form.sql,
        datasource_id: form.datasourceId,
        pre_script_id: form.preScriptId || undefined,
        post_script_id: form.postScriptId || undefined,
        group_id: form.groupId || undefined,
        param_defs: form.paramDefs,
      })
      set({ _savedForm: { ...form }, isDirty: false })
      queryClient.invalidateQueries({ queryKey: ["endpoints", tenant, projectId] })
    } catch (err) {
      set({ designExecResult: { error: "草稿保存失败: " + getErrorMessage(err) }, designExecuting: false })
      return
    }
    try {
      let params: Record<string, string> = {}
      try { params = JSON.parse(paramJSON) } catch { /* ignore */ }
      for (const def of form.paramDefs) {
        if (def.name && !(def.name in params) && def.default) params[def.name] = def.default
      }
      const data = await apiRun(tenant, selectedId, params, true)
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
      // sql-formatter 可能失败，静默忽略
    }
  },

  restoreFromVersion: (version) => {
    const snap = version.snapshot
    if (!snap) return
    const paramDefs = (snap.param_defs || []) as ParamDef[]
    set((s) => {
      const nextForm: EndpointFormState = {
        ...s.form,
        ...(snap.sql !== undefined && { sql: snap.sql }),
        ...(snap.path !== undefined && { path: snap.path }),
        ...(snap.methods?.[0] && { method: snap.methods[0] as HttpMethod }),
        paramDefs,
      }
      return {
        // 复制前的状态备份，供「撤销」使用。如果已有备份，保留最早的那次。
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
        // 如果撤销后内容与上次保存版一致，标记 isDirty=false；否则保留为 true
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
