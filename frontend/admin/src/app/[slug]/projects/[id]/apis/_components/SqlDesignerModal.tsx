"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronRight, Table2, Columns3, AlignLeft, Play, Save, Search,
  ChevronDown, ChevronUp, Database, X, Code2, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Editor from "@monaco-editor/react"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useReferenceData } from "../_hooks/useReferenceData"
import { useSchemaQuery } from "../_hooks/useSchemaQuery"
import { useTenantProject } from "../_hooks/useTenantProject"
import { ParamDefCard } from "./DesignTab/ParamDefCard"
import type { SchemaTable } from "../_hooks/useSchemaQuery"

interface SqlDesignerModalProps {
  open: boolean
  onClose: () => void
}

interface ContextMenuState {
  x: number
  y: number
  table: SchemaTable
}

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-blue-50 text-blue-600",
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

  const [tableSearch, setTableSearch] = useState("")
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [resultsCollapsed, setResultsCollapsed] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // Escape to close modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase())
  )

  function toggleTable(name: string) {
    setExpandedTables(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function insertToSQL(text: string) {
    setFormField("sql", form.sql ? `${form.sql}\n${text}` : text)
  }

  function handleTableContextMenu(e: React.MouseEvent, table: SchemaTable) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, table })
  }

  function runContextAction(sql: string) {
    insertToSQL(sql)
    closeContextMenu()
  }

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
      {/* Backdrop — click closes modal but only if no context menu is open */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-150"
        onClick={() => { if (!contextMenu) onClose() }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="SQL 设计器"
        className="relative w-[96vw] h-[92vh] flex flex-col rounded-2xl overflow-hidden bg-white shadow-2xl border border-zinc-200/80 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* ── Header ── */}
        <div className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-zinc-100 bg-white">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-800 tracking-tight">SQL 设计器</span>
          </div>

          <div className="w-px h-5 bg-zinc-200 shrink-0" />

          {/* Read-only method + path */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={cn(
              "shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider",
              METHOD_STYLE[form.method] ?? "bg-zinc-50 text-zinc-500 border-zinc-200"
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

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={formatSQL}
              className="h-7 px-3 text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all flex items-center gap-1.5"
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
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 rounded-lg gap-1.5"
            >
              {saving
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Save className="w-3 h-3" />}
              {saving ? "保存中…" : "保存"}
            </Button>

            <div className="w-px h-4 bg-zinc-200 mx-1" />

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Col 1: Table Browser ── */}
          <div className="w-52 shrink-0 border-r border-zinc-100 flex flex-col bg-[#fafbfc]">

            {/* Datasource selector */}
            <div className="px-3 pt-3 pb-2.5 border-b border-zinc-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Database className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">数据源</span>
              </div>
              <Select
                value={String(form.datasourceId)}
                onValueChange={v => setFormField("datasourceId", Number(v))}
              >
                <SelectTrigger className="h-7 w-full text-xs border-zinc-200 bg-white rounded-lg shadow-none">
                  <SelectValue placeholder="选择数据源" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map(ds => (
                    <SelectItem key={ds.id} value={String(ds.id)}>{ds.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table search */}
            <div className="px-3 py-2 border-b border-zinc-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-300" />
                <input
                  className="w-full h-7 pl-7 pr-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/50 placeholder:text-zinc-300"
                  placeholder="搜索表名…"
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table tree */}
            <div className="flex-1 overflow-auto py-1">
              {schemaLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                  <span className="text-xs">加载中…</span>
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
                  <Table2 className="w-8 h-8 text-zinc-200" />
                  <p className="text-xs text-zinc-400 text-center leading-relaxed">
                    {form.datasourceId ? "暂无表信息" : "请先选择数据源"}
                  </p>
                </div>
              ) : (
                filteredTables.map(table => (
                  <TableNode
                    key={table.name}
                    table={table}
                    expanded={expandedTables.has(table.name)}
                    onToggle={() => toggleTable(table.name)}
                    onInsertTable={() => insertToSQL(`SELECT * FROM ${table.name} LIMIT 10`)}
                    onInsertColumn={col => insertToSQL(col)}
                    onContextMenu={e => handleTableContextMenu(e, table)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Col 2: SQL Editor + Results ── */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme="light"
                value={form.sql}
                onChange={val => setFormField("sql", val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  padding: { top: 16, bottom: 16 },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  renderLineHighlight: "all",
                  lineHeight: 1.6,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}
              />
            </div>

            {/* Results panel */}
            {designExecResult && (
              <div className={cn(
                "shrink-0 border-t border-zinc-100 flex flex-col transition-all duration-200",
                resultsCollapsed ? "h-9" : "h-52"
              )}>
                <div className="flex items-center justify-between px-4 h-9 bg-zinc-50 border-b border-zinc-100 shrink-0">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">查询结果</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setResultsCollapsed(v => !v)}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {resultsCollapsed
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setDesignExecResult(null)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      清除
                    </button>
                  </div>
                </div>
                {!resultsCollapsed && (
                  <div className="flex-1 overflow-auto bg-white">
                    <ResultPreview result={designExecResult} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Col 3: Params + Script config ── */}
          <div className="w-64 shrink-0 border-l border-zinc-100 flex flex-col bg-white">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ParamDefCard compact />
            </div>

            {/* Script config */}
            <div className="shrink-0 border-t border-zinc-100 px-4 py-3 space-y-2.5 bg-zinc-50/60">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">脚本</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 w-7 shrink-0 font-medium">前置</span>
                <Select
                  value={String(form.preScriptId ?? 0)}
                  onValueChange={v => setFormField("preScriptId", Number(v))}
                >
                  <SelectTrigger className="h-7 flex-1 text-xs border-zinc-200 bg-white rounded-lg shadow-none">
                    <SelectValue placeholder="无" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">无</SelectItem>
                    {scripts.filter(s => s.type === "pre").map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 w-7 shrink-0 font-medium">后置</span>
                <Select
                  value={String(form.postScriptId ?? 0)}
                  onValueChange={v => setFormField("postScriptId", Number(v))}
                >
                  <SelectTrigger className="h-7 flex-1 text-xs border-zinc-200 bg-white rounded-lg shadow-none">
                    <SelectValue placeholder="无" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">无</SelectItem>
                    {scripts.filter(s => s.type === "post").map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context menu — rendered inside the same portal so z-index stacking is correct */}
      {contextMenu && (
        <TableContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          table={contextMenu.table}
          onAction={runContextAction}
          onClose={closeContextMenu}
        />
      )}
    </div>,
    document.body
  )
}

function TableContextMenu({
  x, y, table, onAction, onClose,
}: {
  x: number
  y: number
  table: SchemaTable
  onAction: (sql: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    // Small delay so the right-click that opened the menu doesn't immediately close it
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener("mousedown", handler)
    }
  }, [onClose])

  const colList = table.columns.map(c => `  ${c.name}`).join(",\n")

  return (
    <div
      ref={ref}
      className="absolute z-[100] bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 min-w-[220px] select-none animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 mb-1 flex items-center gap-1.5 border-b border-zinc-100">
        <Table2 className="w-3 h-3 text-blue-500 shrink-0" />
        <span className="text-[10px] font-bold text-zinc-500 truncate">{table.name}</span>
      </div>
      <ContextItem
        label="SELECT *"
        sub={`FROM ${table.name} LIMIT 10`}
        onClick={() => onAction(`SELECT *\nFROM ${table.name}\nLIMIT 10`)}
      />
      <ContextItem
        label="SELECT 字段列表"
        sub="展开所有列名"
        onClick={() => onAction(`SELECT\n${colList}\nFROM ${table.name}\nLIMIT 10`)}
      />
      <ContextItem
        label="SELECT COUNT(*)"
        sub="统计总行数"
        onClick={() => onAction(`SELECT COUNT(*) FROM ${table.name}`)}
      />
      <div className="border-t border-zinc-100 mt-1 pt-1">
        <ContextItem
          label="插入表名"
          sub={table.name}
          onClick={() => onAction(table.name)}
        />
      </div>
    </div>
  )
}

function ContextItem({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700 text-zinc-700 transition-colors text-left"
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
    >
      <span className="font-medium shrink-0">{label}</span>
      <span className="text-[10px] text-zinc-400 font-mono truncate">{sub}</span>
    </button>
  )
}

function TableNode({ table, expanded, onToggle, onInsertTable, onInsertColumn, onContextMenu }: {
  table: SchemaTable
  expanded: boolean
  onToggle: () => void
  onInsertTable: () => void
  onInsertColumn: (col: string) => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-100/80 cursor-pointer group transition-colors"
        onClick={onToggle}
        onContextMenu={onContextMenu}
      >
        <ChevronRight className={cn(
          "w-3 h-3 text-zinc-300 transition-transform shrink-0",
          expanded && "rotate-90"
        )} />
        <Table2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span
          className="text-xs font-medium text-zinc-700 truncate flex-1"
          onDoubleClick={e => { e.stopPropagation(); onInsertTable() }}
          title="右键快捷生成 SQL · 双击插入 SELECT *"
        >
          {table.name}
        </span>
        <span className="text-[9px] text-zinc-400 opacity-0 group-hover:opacity-100 shrink-0 tabular-nums">
          {table.columns.length}
        </span>
      </div>
      {expanded && (
        <div className="pl-7 pb-0.5">
          {table.columns.map(col => (
            <div
              key={col.name}
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-blue-50 cursor-pointer rounded-md mx-1 group/col transition-colors"
              onClick={() => onInsertColumn(col.name)}
              title="点击插入字段名"
            >
              <Columns3 className="w-3 h-3 text-zinc-300 shrink-0" />
              <span className="text-[11px] font-mono text-zinc-600 truncate flex-1 group-hover/col:text-blue-700">
                {col.name}
              </span>
              <span className="text-[9px] text-zinc-400 ml-auto shrink-0 font-mono">
                {col.type.replace("character varying", "varchar").replace("timestamp without time zone", "ts")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultPreview({ result }: { result: unknown }) {
  if (!result) return null

  if (typeof result === "object" && result !== null && "error" in result) {
    return (
      <div className="p-4 text-xs text-red-500 font-mono leading-relaxed">
        {(result as { error: string }).error}
      </div>
    )
  }

  try {
    const arr = extractArray(result)
    if (arr && arr.length > 0) {
      const keys = Object.keys(arr[0] as object)
      return (
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-zinc-50/90 backdrop-blur-sm">
            <tr>
              {keys.map(k => (
                <th key={k} className="px-3 py-2 font-bold text-zinc-400 border-b border-zinc-100 whitespace-nowrap">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {arr.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                {Object.values(row as object).map((v, j) => (
                  <td key={j} className="px-3 py-1.5 text-zinc-600 font-mono whitespace-nowrap border-b border-zinc-50">
                    {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
  } catch { /* ignore */ }

  return <pre className="p-4 text-xs text-zinc-600 font-mono leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
}

function extractArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.list)) return obj.list
  }
  return null
}
