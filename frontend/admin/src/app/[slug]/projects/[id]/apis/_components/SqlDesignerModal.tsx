"use client"

import { useEffect, useCallback, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { AlignLeft, Play, Save, Code2, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useReferenceData } from "../_hooks/useReferenceData"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useEnvironments, useEnvBindings, useProjectBindings, useDataSources, useDataSourceSchema } from "@/hooks"
import { useMemo } from "react"
import { showConfirm } from "@/store/useConfirmStore"
import { ParamDefCard } from "./DesignTab/ParamDefCard"
import { ResponseDefCard } from "./DesignTab/ResponseDefCard"
import { SqlEditorPanel } from "./SqlEditorPanel"
import type { ResponseDef, ParamType } from "../_types"

function extractResponseDefsFromResult(result: unknown): ResponseDef[] {
  let rows: unknown[] = []
  if (Array.isArray(result)) {
    rows = result
  } else if (result && typeof result === "object") {
    const r = result as Record<string, unknown>
    if (Array.isArray(r.data)) rows = r.data
    else if (r.data && typeof r.data === "object") {
      const inner = r.data as Record<string, unknown>
      if (Array.isArray(inner.list)) rows = inner.list
    }
    if (rows.length === 0 && Array.isArray(r.list)) rows = r.list
  }
  if (rows.length === 0) return []
  const first = rows[0]
  if (typeof first !== "object" || first === null) return []
  return Object.entries(first as Record<string, unknown>).map(([name, val]) => ({
    name,
    type: inferType(val),
    desc: "",
  }))
}

function inferType(val: unknown): ParamType {
  if (typeof val === "boolean") return "boolean"
  if (typeof val === "number") return Number.isInteger(val) ? "integer" : "number"
  return "string"
}

interface SqlDesignerModalProps {
  open: boolean
  onClose: () => void
}

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-primary/10 text-primary",
  POST: "bg-emerald-50 text-emerald-600",
  PUT: "bg-amber-50 text-amber-600",
  DELETE: "bg-red-50 text-red-600",
}

export function SqlDesignerModal({ open, onClose }: SqlDesignerModalProps) {
  const { activeTenant, projectId } = useTenantProject()
  const selectedId = useApiEditorStore(s => s.selectedId)
  const isNew = useApiEditorStore(s => s.isNew)
  const setSelectedId = useApiEditorStore(s => s.setSelectedId)
  const setIsNew = useApiEditorStore(s => s.setIsNew)

  const [rightTab, setRightTab] = useState<"params" | "response">("params")

  const form = useEndpointFormStore(s => s.form)
  const setFormField = useEndpointFormStore(s => s.setFormField)
  const saving = useEndpointFormStore(s => s.saving)
  const isDirty = useEndpointFormStore(s => s.isDirty)
  const designExecuting = useEndpointFormStore(s => s.designExecuting)
  const save = useEndpointFormStore(s => s.save)
  const revertToSaved = useEndpointFormStore(s => s.revertToSaved)
  const setResponseDefs = useEndpointFormStore(s => s.setResponseDefs)

  const handleExtractResponseDefs = useCallback((result: unknown) => {
    const defs = extractResponseDefsFromResult(result)
    if (defs.length === 0) return
    setResponseDefs(defs)
    setRightTab("response")
  }, [setResponseDefs])
  const runDesign = useEndpointFormStore(s => s.runDesign)
  const formatSQL = useEndpointFormStore(s => s.formatSQL)
  const designExecResult = useEndpointFormStore(s => s.designExecResult)
  const setDesignExecResult = useEndpointFormStore(s => s.setDesignExecResult)

  const { scripts } = useReferenceData(activeTenant)
  const { data: envs = [] } = useEnvironments(activeTenant, Number(projectId))
  // schema 浏览没有"当前 env"概念了，用项目的默认 env 解析 alias → datasource
  const defaultEnv = useMemo(() => envs.find(e => e.is_default) ?? envs[0], [envs])
  const defaultEnvId = defaultEnv?.id ?? 0
  const defaultEnvName = defaultEnv?.name ?? ''
  const { data: defaultEnvBindings = [] } = useEnvBindings(activeTenant, Number(projectId), defaultEnvId)
  const { data: allBindings = [] } = useProjectBindings(activeTenant, Number(projectId))
  const { dataSources } = useDataSources(activeTenant, { is_pager: 0 })

  // Resolve current alias → physical datasource for schema panel (uses default env).
  const aliasBinding = defaultEnvBindings.find(b => b.alias === form.datasourceAlias)
  const resolvedDsId = aliasBinding?.datasource_id ?? 0
  const { data: tables = [], isLoading: schemaLoading } = useDataSourceSchema(activeTenant, resolvedDsId, !!resolvedDsId)

  // Project-level alias union for the dropdown.
  const aliasNames = Array.from(new Set(allBindings.map(b => b.alias)))
  if (aliasNames.length === 0) aliasNames.push("main")
  const dsNameById = new Map(dataSources.map(d => [d.id, d.name]))
  const aliases = aliasNames.map(name => {
    const b = defaultEnvBindings.find(x => x.alias === name)
    return { name, resolvedName: b ? dsNameById.get(b.datasource_id) : undefined }
  })

  /**
   * 关闭模态前的守卫：表单写到全局 store（用于"执行"功能能读到最新 SQL），
   * 所以如果用户改了东西又点 X / 背景 / Escape 关闭，store 里会留下脏数据。
   * 这里弹一次确认，让用户明确选择是丢弃还是回去保存。
   * 已经在保存的接口（!isNew）才有"上次保存的状态"可回退；新接口直接放过（外层 guardDirty 处理）。
   */
  const guardedClose = useCallback(async () => {
    if (!isDirty || isNew) {
      onClose()
      return
    }
    const ok = await showConfirm("有未保存的修改，关闭将丢弃。是否继续？", "丢弃修改")
    if (!ok) return
    revertToSaved()
    onClose()
  }, [isDirty, isNew, onClose, revertToSaved])

  // Escape to close modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") guardedClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, guardedClose])

  async function handleSave() {
    const saved = await save(activeTenant, projectId, isNew, selectedId)
    if (saved) {
      setSelectedId(saved.id ?? null)
      setIsNew(false)
      onClose()
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-150"
        onClick={guardedClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="SQL 设计器"
        className="relative w-[96vw] h-[92vh] flex flex-col rounded-2xl overflow-hidden bg-white shadow-modal border border-border/80 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* ── Header ── */}
        <div className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-border-subtle bg-white">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">SQL 设计器</span>
          </div>

          <div className="w-px h-5 bg-zinc-200 shrink-0" />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={cn(
              "shrink-0 text-2xs font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider",
              METHOD_STYLE[form.method] ?? "bg-zinc-50 text-muted-foreground border-border"
            )}>
              {form.method}
            </span>
            <span className={cn(
              "text-sm font-mono truncate",
              form.path ? "text-zinc-700" : "text-zinc-300"
            )}>
              {form.path || "在基本信息中设置路径"}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={formatSQL}
              className="h-7 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-zinc-100 rounded-lg transition-all flex items-center gap-1.5"
            >
              <AlignLeft className="w-3 h-3" />
              格式化
            </button>

            <div className="w-px h-4 bg-zinc-200 mx-1" />

            <Button
              size="sm"
              onClick={() => runDesign(activeTenant, projectId, defaultEnvId, selectedId, isNew)}
              disabled={designExecuting || !defaultEnvId}
              className="h-8 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 rounded-lg gap-1.5"
            >
              {designExecuting
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Play className="w-3 h-3" />}
              执行
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 text-xs px-4 rounded-lg gap-1.5"
            >
              {saving
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Save className="w-3 h-3" />}
              {saving ? "保存中…" : "保存"}
            </Button>

            <div className="w-px h-4 bg-zinc-200 mx-1" />

            <button
              onClick={guardedClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-zinc-600 hover:bg-zinc-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">
          <SqlEditorPanel
            sql={form.sql}
            datasourceAlias={form.datasourceAlias}
            preScripts={form.preScripts}
            postScripts={form.postScripts}
            aliases={aliases}
            currentEnvName={defaultEnvName}
            scripts={scripts}
            tables={tables}
            schemaLoading={schemaLoading}
            designExecResult={designExecResult}
            onSqlChange={val => setFormField("sql", val)}
            onDatasourceAliasChange={h => setFormField("datasourceAlias", h)}
            onPreScriptsChange={steps => setFormField("preScripts", steps)}
            onPostScriptsChange={steps => setFormField("postScripts", steps)}
            onClearResult={() => setDesignExecResult(null)}
            onExtractResponseDefs={handleExtractResponseDefs}
          />

          {/* ── Col 3: 参数 / 响应 tab ── */}
          <RightPanel rightTab={rightTab} onTabChange={setRightTab} />
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── RightPanel ────────────────────────────────────────────────────────────────

function RightPanel({
  rightTab,
  onTabChange,
}: {
  rightTab: "params" | "response"
  onTabChange: (tab: "params" | "response") => void
}) {
  const paramCount    = useEndpointFormStore(s => s.form.paramDefs.length)
  const responseCount = useEndpointFormStore(s => s.form.responseDefs.length)

  return (
    <div className="w-64 shrink-0 border-l border-border-subtle flex flex-col bg-white">
      {/* Tab header */}
      <div className="flex shrink-0 border-b border-border-subtle">
        {([
          { key: "params",   label: "请求参数", count: paramCount },
          { key: "response", label: "响应字段", count: responseCount },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              "flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors",
              rightTab === key
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-zinc-600"
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                "text-2xs px-1.5 py-0.5 rounded-full font-bold leading-none",
                rightTab === key ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-400"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {rightTab === "params" ? <ParamDefCard compact /> : <ResponseDefCard />}
      </div>
    </div>
  )
}
