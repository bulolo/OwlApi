"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronRight, Table2, Columns3, Database, Search, Loader2,
  ChevronDown, ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SchemaTable } from "@/hooks"
import { SqlResultPreview } from "./SqlResultPreview"
import { ChainEditor } from "./ChainEditor"
import type { ScriptStep } from "../_types"

// ─── Types ────────────────────────────────────────────────────────────────────

/** An alias option shown in the dropdown — name + (optional) the physical
 * datasource it resolves to in the *currently selected* env. */
interface AliasOption { name: string; resolvedName?: string }
interface Script { id?: number; name: string; type: string }

interface ContextMenuState {
  x: number
  y: number
  table: SchemaTable
}

// ─── ContextItem ──────────────────────────────────────────────────────────────

function ContextItem({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs hover:bg-primary/10 hover:text-primary/90 text-zinc-700 transition-colors text-left"
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
    >
      <span className="font-medium shrink-0">{label}</span>
      <span className="text-2xs text-muted-foreground font-mono truncate">{sub}</span>
    </button>
  )
}

// ─── TableNode ────────────────────────────────────────────────────────────────

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
        <ChevronRight className={cn("w-3 h-3 text-zinc-300 transition-transform shrink-0", expanded && "rotate-90")} />
        <Table2 className="w-3.5 h-3.5 text-primary/60 shrink-0" />
        <span
          className="text-xs font-medium text-zinc-700 truncate flex-1"
          onDoubleClick={e => { e.stopPropagation(); onInsertTable() }}
          title="右键快捷生成 SQL · 双击插入 SELECT *"
        >
          {table.name}
        </span>
        <span className="text-2xs text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 tabular-nums">
          {table.columns.length}
        </span>
      </div>
      {expanded && (
        <div className="pl-7 pb-0.5">
          {table.columns.map(col => (
            <div
              key={col.name}
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-primary/10 cursor-pointer rounded-md mx-1 group/col transition-colors"
              onClick={() => onInsertColumn(col.name)}
              title="点击插入字段名"
            >
              <Columns3 className="w-3 h-3 text-zinc-300 shrink-0" />
              <span className="text-xs font-mono text-zinc-600 truncate flex-1 group-hover/col:text-primary">
                {col.name}
              </span>
              <span className="text-2xs text-muted-foreground ml-auto shrink-0 font-mono">
                {col.type.replace("character varying", "varchar").replace("timestamp without time zone", "ts")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TableContextMenu ─────────────────────────────────────────────────────────

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
      className="absolute z-50 bg-white border border-border rounded-xl shadow-modal py-1.5 min-w-[220px] select-none animate-in fade-in zoom-in-95 duration-150"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 mb-1 flex items-center gap-1.5 border-b border-border-subtle">
        <Table2 className="w-3 h-3 text-primary/80 shrink-0" />
        <span className="text-2xs font-bold text-muted-foreground truncate">{table.name}</span>
      </div>
      <ContextItem label="SELECT *" sub={`FROM ${table.name} LIMIT 10`} onClick={() => onAction(`SELECT *\nFROM ${table.name}\nLIMIT 10`)} />
      <ContextItem label="SELECT 字段列表" sub="展开所有列名" onClick={() => onAction(`SELECT\n${colList}\nFROM ${table.name}\nLIMIT 10`)} />
      <ContextItem label="SELECT COUNT(*)" sub="统计总行数" onClick={() => onAction(`SELECT COUNT(*) FROM ${table.name}`)} />
      <div className="border-t border-border-subtle mt-1 pt-1">
        <ContextItem label="插入表名" sub={table.name} onClick={() => onAction(table.name)} />
      </div>
    </div>
  )
}

// ─── SqlEditorPanel ───────────────────────────────────────────────────────────

interface SqlEditorPanelProps {
  sql: string
  datasourceAlias: string
  preScripts: ScriptStep[]
  postScripts: ScriptStep[]
  aliases: AliasOption[]
  currentEnvName: string
  scripts: Script[]
  tables: SchemaTable[]
  schemaLoading: boolean
  designExecResult: unknown
  onSqlChange: (sql: string) => void
  onDatasourceAliasChange: (alias: string) => void
  onPreScriptsChange: (steps: ScriptStep[]) => void
  onPostScriptsChange: (steps: ScriptStep[]) => void
  onClearResult: () => void
  onExtractResponseDefs?: (result: unknown) => void
}

export function SqlEditorPanel({
  sql, datasourceAlias, preScripts, postScripts,
  aliases, currentEnvName, scripts, tables, schemaLoading,
  designExecResult,
  onSqlChange, onDatasourceAliasChange, onPreScriptsChange, onPostScriptsChange, onClearResult,
  onExtractResponseDefs,
}: SqlEditorPanelProps) {
  const [tableSearch, setTableSearch] = useState("")
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [resultsCollapsed, setResultsCollapsed] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase())
  )

  function toggleTable(name: string) {
    setExpandedTables(prev => {
      const next = new Set(prev)
      if (next.has(name)) { next.delete(name) } else { next.add(name) }
      return next
    })
  }

  function insertToSQL(text: string) {
    onSqlChange(sql ? `${sql}\n${text}` : text)
  }

  function handleTableContextMenu(e: React.MouseEvent, table: SchemaTable) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, table })
  }

  function runContextAction(s: string) {
    insertToSQL(s)
    closeContextMenu()
  }

  return (
    <>
      {/* ── Col 1: Table Browser ── */}
      <div className="w-72 shrink-0 border-r border-border-subtle flex flex-col bg-zinc-50/60">
        {/* Datasource alias selector. Alias is project-scoped; what physical
            DB it resolves to depends on the env you're viewing. */}
        <div className="px-3 pt-3 pb-2.5 border-b border-border-subtle">
          <div className="flex items-center gap-1.5 mb-2">
            <Database className="w-3 h-3 text-muted-foreground" />
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">数据源别名</span>
          </div>
          <Select value={datasourceAlias} onValueChange={onDatasourceAliasChange}>
            <SelectTrigger className="h-7 w-full text-xs border-border bg-white rounded-lg shadow-none">
              <SelectValue placeholder="选择别名" />
            </SelectTrigger>
            <SelectContent>
              {aliases.length === 0 && (
                <SelectItem value="main" disabled>main (未配置)</SelectItem>
              )}
              {aliases.map(a => (
                <SelectItem key={a.name} value={a.name}>
                  <span className="font-bold">{a.name}</span>
                  {a.resolvedName && (
                    <span className="ml-2 text-2xs text-muted-foreground">→ {a.resolvedName}</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-2xs text-muted-foreground mt-1.5">
            在 <span className="font-bold uppercase">{currentEnvName || '当前 env'}</span> 解析自 Environments 绑定
          </p>
        </div>

        {/* Table search */}
        <div className="px-3 py-2 border-b border-border-subtle">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              className="w-full h-7 pl-7 pr-2 text-xs bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-zinc-300"
              placeholder="搜索表名…"
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table tree */}
        <div className="flex-1 overflow-auto py-1">
          {schemaLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
              <span className="text-xs">加载中…</span>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
              <Table2 className="w-8 h-8 text-zinc-200" />
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                {datasourceAlias ? "暂无表信息（别名可能未绑定数据源）" : "请先选择数据源别名"}
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

        {/* Script config — 前置 / 后置 有序链（库引用 + 内联） */}
        <div className="shrink-0 border-t border-border-subtle px-3 py-3 space-y-3 bg-zinc-50/60">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">前置链</span>
              <span className="text-2xs text-muted-foreground/70">params 依次流过</span>
            </div>
            <ChainEditor phase="pre" steps={preScripts} scripts={scripts} onChange={onPreScriptsChange} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">后置链</span>
              <span className="text-2xs text-muted-foreground/70">data 依次流过，包装放链尾</span>
            </div>
            <ChainEditor phase="post" steps={postScripts} scripts={scripts} onChange={onPostScriptsChange} />
          </div>
        </div>
      </div>

      {/* ── Col 2: SQL Editor + Results ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme="light"
            value={sql}
            onChange={val => onSqlChange(val || "")}
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
        {designExecResult != null && (
          <div className={cn(
            "shrink-0 border-t border-border-subtle flex flex-col transition-all duration-200",
            resultsCollapsed ? "h-9" : "h-52"
          )}>
            <div className="flex items-center justify-between px-4 h-9 bg-zinc-50 border-b border-border-subtle shrink-0">
              <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">查询结果</span>
              <div className="flex items-center gap-3">
                {onExtractResponseDefs && (
                  <button
                    onClick={() => onExtractResponseDefs(designExecResult)}
                    className="text-2xs font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    提取响应字段
                  </button>
                )}
                <button
                  onClick={() => setResultsCollapsed(v => !v)}
                  className="text-muted-foreground hover:text-zinc-600 transition-colors"
                >
                  {resultsCollapsed
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={onClearResult}
                  className="text-2xs text-muted-foreground hover:text-zinc-600 transition-colors"
                >
                  清除
                </button>
              </div>
            </div>
            {!resultsCollapsed && (
              <div className="flex-1 overflow-auto bg-white">
                <SqlResultPreview result={designExecResult} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <TableContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          table={contextMenu.table}
          onAction={runContextAction}
          onClose={closeContextMenu}
        />
      )}
    </>
  )
}
