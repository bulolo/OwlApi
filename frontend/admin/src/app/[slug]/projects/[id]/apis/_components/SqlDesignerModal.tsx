"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { AlignLeft, Play, Save, Code2, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useReferenceData } from "../_hooks/useReferenceData"
import { useSchemaQuery } from "../_hooks/useSchemaQuery"
import { useTenantProject } from "../_hooks/useTenantProject"
import { ParamDefCard } from "./DesignTab/ParamDefCard"
import { SqlEditorPanel } from "./SqlEditorPanel"

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

  const form = useEndpointFormStore(s => s.form)
  const setFormField = useEndpointFormStore(s => s.setFormField)
  const saving = useEndpointFormStore(s => s.saving)
  const designExecuting = useEndpointFormStore(s => s.designExecuting)
  const save = useEndpointFormStore(s => s.save)
  const runDesign = useEndpointFormStore(s => s.runDesign)
  const formatSQL = useEndpointFormStore(s => s.formatSQL)
  const designExecResult = useEndpointFormStore(s => s.designExecResult)
  const setDesignExecResult = useEndpointFormStore(s => s.setDesignExecResult)

  const { dataSources, scripts } = useReferenceData(activeTenant)
  const { data: tables = [], isLoading: schemaLoading } = useSchemaQuery(activeTenant, form.datasourceId)

  // Escape to close modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

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
        onClick={onClose}
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
              onClick={() => runDesign(activeTenant, projectId, selectedId, isNew)}
              disabled={designExecuting}
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
              onClick={onClose}
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
            datasourceId={form.datasourceId}
            preScriptId={form.preScriptId}
            postScriptId={form.postScriptId}
            dataSources={dataSources}
            scripts={scripts}
            tables={tables}
            schemaLoading={schemaLoading}
            designExecResult={designExecResult}
            onSqlChange={val => setFormField("sql", val)}
            onDatasourceChange={id => setFormField("datasourceId", id)}
            onPreScriptChange={id => setFormField("preScriptId", id)}
            onPostScriptChange={id => setFormField("postScriptId", id)}
            onClearResult={() => setDesignExecResult(null)}
          />

          {/* ── Col 3: Params ── */}
          <div className="w-64 shrink-0 border-l border-border-subtle flex flex-col bg-white">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ParamDefCard compact />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
