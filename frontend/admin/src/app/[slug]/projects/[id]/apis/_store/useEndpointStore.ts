"use client"

/**
 * useEndpointStore — API Endpoint 核心状态管理
 *
 * 管理：endpoint 列表、选中态、表单编辑态、CRUD 操作、
 *      执行/调试态、分组管理、引用数据（数据源/脚本）
 */
import { create } from "zustand"
import { toast } from "sonner"
import {
  apiListEndpoints,
  apiCreateEndpoint,
  apiUpdateEndpoint,
  apiDeleteEndpoint,
  apiListDataSources,
  apiListScripts,
  apiListGroups,
  apiCreateGroup,
  apiUpdateGroup,
  apiDeleteGroup,
  apiTestQuery,
  type ApiEndpoint,
  type DataSource,
  type Script,
  type ApiGroup,
} from "@/lib/api-client"
import { format as formatSql } from "sql-formatter"
import { getErrorMessage } from "@/lib/errors"
import type {
  HttpMethod,
  ActiveTab,
  ParamDef,
  ExecutionResult,
  GroupModalState,
} from "../_types"

// ── Store 类型 ──

interface EndpointStoreState {
  // 列表
  endpoints: ApiEndpoint[]
  loading: boolean

  // 选中
  selectedId: number | null
  isNew: boolean

  // UI
  searchTerm: string
  sidebarOpen: boolean
  activeTab: ActiveTab
  expandedGroups: number[]

  // 表单 (被选中/新建的 endpoint 的编辑态)
  form: {
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

  // 调试
  authToken: string
  paramJSON: string
  executing: boolean
  execResult: ExecutionResult

  // 设计执行
  designExecuting: boolean
  designExecResult: ExecutionResult

  // 保存
  saving: boolean

  // 引用数据
  dataSources: DataSource[]
  scripts: Script[]
  groups: ApiGroup[]

  // 分组 Modal
  groupModal: GroupModalState
}

interface EndpointStoreActions {
  // 数据加载
  fetchAll: (tenant: string, projectId: string) => Promise<void>
  fetchEndpoints: (tenant: string, projectId: string) => Promise<void>
  fetchGroups: (tenant: string, projectId: string) => Promise<void>

  // 选择 & 新建
  selectEndpoint: (ep: ApiEndpoint) => void
  createNew: () => void
  clearSelection: () => void

  // 表单修改
  setFormField: <K extends keyof EndpointStoreState["form"]>(key: K, value: EndpointStoreState["form"][K]) => void
  setParamDefs: (updater: ParamDef[] | ((prev: ParamDef[]) => ParamDef[])) => void
  resetForm: (endpoints: ApiEndpoint[]) => void

  // CRUD
  save: (tenant: string, projectId: string) => Promise<void>
  deleteEndpoint: (tenant: string, projectId: string, ep: ApiEndpoint) => Promise<void>

  // 执行
  runDebug: (tenant: string) => Promise<void>
  runDesign: (tenant: string, projectId: string) => Promise<void>

  // 格式化
  formatSQL: () => void

  // UI
  setSearchTerm: (term: string) => void
  setSidebarOpen: (open: boolean) => void
  setActiveTab: (tab: ActiveTab) => void
  toggleGroup: (gid: number) => void
  setAuthToken: (token: string) => void
  setParamJSON: (json: string) => void
  setExecResult: (r: ExecutionResult) => void
  setDesignExecResult: (r: ExecutionResult) => void

  // 分组 Modal
  openGroupModal: (mode: "create" | "edit", group?: ApiGroup) => void
  closeGroupModal: () => void
  setGroupModalName: (name: string) => void
  submitGroupModal: (tenant: string, projectId: string) => Promise<void>
  deleteGroup: (tenant: string, projectId: string, gid: number) => Promise<void>
}

export type EndpointStore = EndpointStoreState & EndpointStoreActions

// ── 初始值 ──

const initialForm: EndpointStoreState["form"] = {
  path: "",
  method: "POST",
  sql: "",
  datasourceId: 0,
  groupId: 0,
  preScriptId: 0,
  postScriptId: 0,
  paramDefs: [],
  paramInput: "",
}

const initialGroupModal: GroupModalState = {
  open: false,
  mode: "create",
  name: "",
  editingGroupId: null,
}

// ── 工具函数 ──

function extractSQLParams(sql: string): string[] {
  const matches = sql.match(/:([a-zA-Z_]\w*)/g)
  if (!matches) return []
  return Array.from(new Set(matches.map(m => m.slice(1))))
}

function buildParamJSON(paramDefs: ParamDef[]): string {
  if (paramDefs.length === 0) return "{}"
  const obj: Record<string, string> = {}
  for (const p of paramDefs) {
    obj[p.name] = p.default ?? ""
  }
  return JSON.stringify(obj, null, 2)
}

// ── Store ──

export const useEndpointStore = create<EndpointStore>((set, get) => ({
  // 初始状态
  endpoints: [],
  loading: true,
  selectedId: null,
  isNew: false,
  searchTerm: "",
  sidebarOpen: true,
  activeTab: "design",
  expandedGroups: [0],
  form: { ...initialForm },
  authToken: "",
  paramJSON: "{}",
  executing: false,
  execResult: null,
  designExecuting: false,
  designExecResult: null,
  saving: false,
  dataSources: [],
  scripts: [],
  groups: [],
  groupModal: { ...initialGroupModal },

  // ── 数据加载 ──

  fetchAll: async (tenant, projectId) => {
    const state = get()
    state.fetchEndpoints(tenant, projectId)
    state.fetchGroups(tenant, projectId)

    try {
      const dsData = await apiListDataSources(tenant)
      const dsList = dsData.list || []
      set(s => ({
        dataSources: dsList,
        form: { ...s.form, datasourceId: s.form.datasourceId || (dsList[0]?.id ?? 0) },
      }))
    } catch (err) {
      console.error("[OwlApi] 加载数据源失败:", err)
    }

    try {
      const scriptData = await apiListScripts(tenant)
      set({ scripts: scriptData.list || [] })
    } catch (err) {
      console.error("[OwlApi] 加载脚本失败:", err)
    }
  },

  fetchEndpoints: async (tenant, projectId) => {
    if (!tenant) return
    set({ loading: true })
    try {
      const data = await apiListEndpoints(tenant, Number(projectId))
      set({ endpoints: data.list || [] })
    } catch (err) {
      console.error("[OwlApi] 加载接口列表失败:", err)
      toast.error("加载接口列表失败", { description: getErrorMessage(err) })
    } finally {
      set({ loading: false })
    }
  },

  fetchGroups: async (tenant, projectId) => {
    if (!tenant) return
    try {
      const data = await apiListGroups(tenant, Number(projectId))
      set({ groups: data.list || [] })
    } catch (err) {
      console.error("[OwlApi] 加载分组失败:", err)
    }
  },

  // ── 选择 & 新建 ──

  selectEndpoint: (ep) => {
    set({
      selectedId: ep.id ?? null,
      isNew: false,
      execResult: null,
      designExecResult: null,
      activeTab: "design",
      form: {
        path: ep.path ?? "",
        method: (ep.methods?.[0] ?? "POST") as HttpMethod,
        sql: ep.sql ?? "",
        datasourceId: ep.datasource_id || get().form.datasourceId,
        groupId: ep.group_id || 0,
        preScriptId: ep.pre_script_id || 0,
        postScriptId: ep.post_script_id || 0,
        paramDefs: (ep.param_defs || []) as ParamDef[],
        paramInput: "",
      },
    })
    // 同步更新 paramJSON
    set({ paramJSON: buildParamJSON((ep.param_defs || []) as ParamDef[]) })
  },

  createNew: () => {
    const ds = get().dataSources
    set({
      selectedId: null,
      isNew: true,
      execResult: null,
      designExecResult: null,
      activeTab: "design",
      form: {
        ...initialForm,
        datasourceId: ds[0]?.id ?? 0,
      },
      paramJSON: "{}",
    })
  },

  clearSelection: () => {
    set({
      selectedId: null,
      isNew: false,
      execResult: null,
      designExecResult: null,
      form: { ...initialForm },
      paramJSON: "{}",
    })
  },

  // ── 表单修改 ──

  setFormField: (key, value) => {
    set(s => ({
      form: { ...s.form, [key]: value },
    }))
    // 当 paramDefs 改变时同步 paramJSON
    if (key === "paramDefs") {
      set({ paramJSON: buildParamJSON(value as ParamDef[]) })
    }
  },

  setParamDefs: (updater) => {
    set(s => {
      const newDefs = typeof updater === "function" ? updater(s.form.paramDefs) : updater
      return {
        form: { ...s.form, paramDefs: newDefs },
        paramJSON: buildParamJSON(newDefs),
      }
    })
  },

  resetForm: (endpoints) => {
    const { selectedId, isNew } = get()
    if (selectedId) {
      const ep = endpoints.find(e => e.id === selectedId)
      if (ep) get().selectEndpoint(ep)
    } else if (isNew) {
      get().createNew()
    }
  },

  // ── CRUD ──

  save: async (tenant, projectId) => {
    const { form, isNew, selectedId } = get()
    if (!form.path || !form.sql) {
      toast.error("请填写路径和 SQL")
      return
    }

    const paramNames = form.paramDefs.map(d => d.name).filter(Boolean)
    const payload = {
      path: form.path,
      methods: [form.method],
      sql: form.sql,
      params: paramNames,
      param_defs: form.paramDefs,
      datasource_id: form.datasourceId,
      group_id: form.groupId,
      pre_script_id: form.preScriptId,
      post_script_id: form.postScriptId,
    }

    set({ saving: true })
    try {
      if (isNew) {
        const created = await apiCreateEndpoint(tenant, Number(projectId), payload)
        await get().fetchEndpoints(tenant, projectId)
        get().selectEndpoint(created)
        toast.success("接口创建成功")
      } else if (selectedId) {
        await apiUpdateEndpoint(tenant, Number(projectId), selectedId, payload)
        await get().fetchEndpoints(tenant, projectId)
        toast.success("接口更新成功")
      }
    } catch (err) {
      toast.error("操作失败", { description: getErrorMessage(err) })
      set({ activeTab: "design" })
    } finally {
      set({ saving: false })
    }
  },

  deleteEndpoint: async (tenant, projectId, ep) => {
    if (!ep.id || !confirm(`确定删除接口 ${ep.path ?? ""}？`)) return
    try {
      await apiDeleteEndpoint(tenant, Number(projectId), ep.id)
      if (get().selectedId === ep.id) get().clearSelection()
      get().fetchEndpoints(tenant, projectId)
      toast.success("接口已删除")
    } catch (err) {
      toast.error("删除失败", { description: getErrorMessage(err) })
    }
  },

  // ── 执行 ──

  runDebug: async (tenant) => {
    const { selectedId, paramJSON, form } = get()
    if (!selectedId) {
      toast.error("请先保存接口")
      return
    }

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
        if (def.name && !(def.name in params) && def.default) {
          params[def.name] = def.default
        }
      }
      const data = await apiTestQuery(tenant, selectedId, params)
      set({ execResult: data as ExecutionResult })
    } catch (err) {
      set({ execResult: { error: getErrorMessage(err) } })
    } finally {
      set({ executing: false })
    }
  },

  runDesign: async (tenant, projectId) => {
    const { form, selectedId, paramJSON } = get()
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
      let params: Record<string, string> = {}
      try { params = JSON.parse(paramJSON) } catch { /* ignore */ }
      for (const def of form.paramDefs) {
        if (def.name && !(def.name in params) && def.default) {
          params[def.name] = def.default
        }
      }

      let epId = selectedId
      if (!epId) {
        if (!form.path.trim()) {
          set({ designExecResult: { error: "请先填写接口路径" }, designExecuting: false })
          return
        }
        try {
          const ep = await apiCreateEndpoint(tenant, Number(projectId), {
            path: form.path,
            methods: [form.method],
            sql: form.sql,
            datasource_id: form.datasourceId,
            pre_script_id: form.preScriptId || undefined,
            post_script_id: form.postScriptId || undefined,
            group_id: form.groupId || undefined,
          })
          epId = ep.id
          set({ selectedId: ep.id, isNew: false })
          get().fetchEndpoints(tenant, projectId)
        } catch (err) {
          set({ designExecResult: { error: "自动保存失败: " + getErrorMessage(err) }, designExecuting: false })
          return
        }
      } else {
        try {
          await apiUpdateEndpoint(tenant, Number(projectId), epId, {
            path: form.path,
            methods: [form.method],
            sql: form.sql,
            datasource_id: form.datasourceId,
            pre_script_id: form.preScriptId || undefined,
            post_script_id: form.postScriptId || undefined,
            group_id: form.groupId || undefined,
          })
        } catch (err) {
          set({ designExecResult: { error: "自动保存草稿失败: " + getErrorMessage(err) }, designExecuting: false })
          return
        }
      }

      const data = await apiTestQuery(tenant, epId!, params, true)
      set({ designExecResult: data as ExecutionResult })
    } catch (err) {
      set({ designExecResult: { error: getErrorMessage(err) } })
    } finally {
      set({ designExecuting: false })
    }
  },

  // ── 格式化 ──

  formatSQL: () => {
    try {
      const { form } = get()
      const paramsArr: string[] = []
      let sql = form.sql.replace(/:([a-zA-Z_]\w*)/g, (_, name: string) => {
        paramsArr.push(name)
        return `__OWLPARAM${paramsArr.length - 1}__`
      })
      sql = formatSql(sql, { language: "postgresql", keywordCase: "upper" })
      sql = sql.replace(/__OWLPARAM(\d+)__/g, (_, i: string) => `:${paramsArr[Number(i)]}`)
      set(s => ({ form: { ...s.form, sql } }))
    } catch {
      // sql-formatter 可能失败，静默忽略
    }
  },

  // ── UI ──

  setSearchTerm: (term) => set({ searchTerm: term }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleGroup: (gid) => set(s => ({
    expandedGroups: s.expandedGroups.includes(gid)
      ? s.expandedGroups.filter(id => id !== gid)
      : [...s.expandedGroups, gid],
  })),
  setAuthToken: (token) => set({ authToken: token }),
  setParamJSON: (json) => set({ paramJSON: json }),
  setExecResult: (r) => set({ execResult: r }),
  setDesignExecResult: (r) => set({ designExecResult: r }),

  // ── 分组 Modal ──

  openGroupModal: (mode, group) => {
    set({
      groupModal: {
        open: true,
        mode,
        name: group?.name || "",
        editingGroupId: group?.id ?? null,
      },
    })
  },

  closeGroupModal: () => set({ groupModal: { ...initialGroupModal } }),
  setGroupModalName: (name) => set(s => ({ groupModal: { ...s.groupModal, name } })),

  submitGroupModal: async (tenant, projectId) => {
    const { groupModal } = get()
    if (!groupModal.name) return
    try {
      if (groupModal.mode === "create") {
        await apiCreateGroup(tenant, Number(projectId), { name: groupModal.name })
        toast.success("分组已创建")
      } else if (groupModal.editingGroupId) {
        await apiUpdateGroup(tenant, Number(projectId), groupModal.editingGroupId, { name: groupModal.name })
        toast.success("分组已更新")
      }
      set({ groupModal: { ...initialGroupModal } })
      get().fetchGroups(tenant, projectId)
    } catch (err) {
      toast.error("操作失败", { description: getErrorMessage(err) })
    }
  },

  deleteGroup: async (tenant, projectId, gid) => {
    if (!confirm("确定删除分组？")) return
    try {
      await apiDeleteGroup(tenant, Number(projectId), gid)
      get().fetchGroups(tenant, projectId)
      get().fetchEndpoints(tenant, projectId)
      toast.success("分组已删除")
    } catch (err) {
      toast.error("删除分组失败", { description: getErrorMessage(err) })
    }
  },
}))
