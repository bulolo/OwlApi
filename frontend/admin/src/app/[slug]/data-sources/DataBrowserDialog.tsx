"use client"

import { useState, type ReactNode } from "react"
import Image from "next/image"
import { Table2, Loader2, AlertCircle, Search, Columns3, Rows3, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import type { DataSource } from "@/lib/api-client"
import type { SchemaTable, SchemaColumn } from "@/lib/api-client"
import { useDataSourceSchema, useDataSourcePreview } from "@/hooks"
import { DB_TYPES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  ds: DataSource
}

type Tab = "schema" | "data"

// ── Type helpers ──────────────────────────────────────────────────────────────

function typeColor(type: string): string {
  const t = type.toLowerCase()
  if (/int|bigint|serial|numeric|decimal|float|double|real/.test(t)) return "text-emerald-600"
  if (/bool/.test(t)) return "text-purple-600"
  if (/date|time|timestamp/.test(t)) return "text-amber-600"
  if (/text|varchar|char|string|clob/.test(t)) return "text-sky-600"
  return "text-zinc-500"
}

function isNumericType(col: SchemaColumn): boolean {
  return /int|bigint|serial|numeric|decimal|float|double|real/.test(col.type.toLowerCase())
}

function CellValue({ val }: { val: unknown }): ReactNode {
  if (val == null)
    return <span className="inline-block px-1.5 py-px text-[10px] font-mono rounded bg-zinc-100 text-zinc-400 leading-tight">NULL</span>
  if (typeof val === "boolean")
    return <span className={val ? "text-emerald-600 font-bold" : "text-red-400 font-bold"}>{String(val)}</span>
  const str = String(val)
  if (str.length > 80)
    return <span title={str} className="cursor-default">{str.slice(0, 80)}<span className="text-zinc-400">…</span></span>
  return <>{str}</>
}

// ── Schema grouping (SQL Server "schema.table" format) ────────────────────────

function splitSchemaTable(name: string): { schema: string; table: string } {
  const dot = name.indexOf(".")
  if (dot < 0) return { schema: "", table: name }
  return { schema: name.slice(0, dot), table: name.slice(dot + 1) }
}

function groupBySchema(tables: SchemaTable[]) {
  const map = new Map<string, SchemaTable[]>()
  for (const t of tables) {
    const { schema } = splitSchemaTable(t.name)
    if (!map.has(schema)) map.set(schema, [])
    map.get(schema)!.push(t)
  }
  return Array.from(map.entries()).map(([schema, tables]) => ({ schema, tables }))
}

// ── Unified TableSidebar ──────────────────────────────────────────────────────
// Renders a flat list for most databases, or a collapsible schema-tree for
// SQL Server (schemaGroups prop). Both modes share one search input.

function TableSidebar({
  tables,
  selected,
  search,
  onSearch,
  onSelect,
  isSQLServer,
}: {
  tables: SchemaTable[]
  selected: string | null
  search: string
  onSearch: (v: string) => void
  onSelect: (name: string) => void
  isSQLServer: boolean
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (schema: string) =>
    setExpanded(prev => prev.has(schema) ? new Set() : new Set([schema]))

  const filtered = search ? tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : null
  const groups   = groupBySchema(tables)

  const rowCls = (name: string) => cn(
    "w-full text-left px-3 py-1.5 text-[11px] transition-colors flex items-center gap-2",
    selected === name ? "bg-blue-600 text-white" : "text-zinc-600 hover:bg-zinc-100",
  )
  const iconCls = (name: string) => cn("w-3 h-3 shrink-0", selected === name ? "text-white/70" : "text-zinc-400")
  const countCls = (name: string) => cn("text-[10px] shrink-0 tabular-nums", selected === name ? "text-white/70" : "text-zinc-400")

  const renderFlatList = (items: SchemaTable[], indent = false) =>
    items.map(t => {
      const displayName = isSQLServer ? splitSchemaTable(t.name).table : t.name
      return (
        <button
          key={t.name}
          onClick={() => onSelect(t.name)}
          className={cn(rowCls(t.name), indent && "pl-6")}
        >
          <Table2 className={iconCls(t.name)} />
          <span className="flex-1 min-w-0 truncate font-medium">{displayName}</span>
          <span className={countCls(t.name)}>{t.columns.length}</span>
        </button>
      )
    })

  return (
    <>
      <div className="px-2.5 py-2 border-b border-zinc-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
          <Input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="过滤表名..."
            className="pl-6 h-7 text-[11px] bg-white border-zinc-200 rounded focus-visible:ring-1 focus-visible:ring-blue-400"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {filtered !== null ? (
            filtered.length === 0
              ? <p className="text-[11px] text-zinc-400 text-center py-4">无匹配</p>
              : renderFlatList(filtered)
          ) : isSQLServer ? (
            groups.map(({ schema, tables: schemaTables }) => (
              <div key={schema}>
                <button
                  onClick={() => toggle(schema)}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
                >
                  <ChevronRight className={cn("w-3 h-3 shrink-0 transition-transform text-zinc-400", expanded.has(schema) && "rotate-90")} />
                  <span className="flex-1 min-w-0 truncate uppercase tracking-wide">{schema || "(default)"}</span>
                  <span className="text-[10px] font-normal text-zinc-400 shrink-0">{schemaTables.length}</span>
                </button>
                {expanded.has(schema) && renderFlatList(schemaTables, true)}
              </div>
            ))
          ) : (
            renderFlatList(tables)
          )}
        </div>
      </ScrollArea>
    </>
  )
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export function DataBrowserDialog({ open, onClose, slug, ds }: Props) {
  const [tableSearch, setTableSearch] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("schema")

  const dsId = ds.id!
  const isSQLServer = ds.type === "sqlserver"

  const {
    data: tables = [],
    isLoading: loadingSchema,
    error: schemaError,
  } = useDataSourceSchema(slug, dsId, open)

  // Auto-select first table once schema loads.
  const resolvedSelected = selected ?? (tables.length > 0 ? tables[0].name : null)

  const {
    data: rows = [],
    isLoading: loadingRows,
    error: rowsError,
  } = useDataSourcePreview(slug, dsId, resolvedSelected, open && tab === "data")

  const handleSelectTable = (name: string) => {
    setSelected(name)
    setTab("schema")
  }

  const currentTable = tables.find(t => t.name === resolvedSelected)
  const dataColumns  = rows.length > 0
    ? Object.keys(rows[0])
    : currentTable?.columns.map(c => c.name) ?? []
  const dbLabel = DB_TYPES[ds.type as keyof typeof DB_TYPES]?.label ?? ds.type?.toUpperCase()
  const selectedDisplayName = resolvedSelected
    ? (isSQLServer ? splitSchemaTable(resolvedSelected).table : resolvedSelected)
    : null

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!o) {
          setSelected(null)
          setTableSearch("")
          setTab("schema")
          onClose()
        }
      }}
    >
      <DialogContent
        className="w-[96vw] max-w-none p-0 overflow-hidden flex flex-col gap-0 rounded-2xl border-zinc-200"
        style={{ height: "92vh" }}
      >
        <DialogTitle className="sr-only">数据浏览 — {ds.name}</DialogTitle>

        {/* Title bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-100 bg-zinc-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white border border-zinc-200 shadow-sm">
              <Image src={`/db-icons/${ds.type}.svg`} alt={ds.type} width={16} height={16} className="object-contain" unoptimized />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 leading-tight">{ds.name}</p>
              <p className="text-[10px] text-zinc-400 leading-tight">{dbLabel}</p>
            </div>
          </div>
          {!loadingSchema && tables.length > 0 && (
            <span className="ml-1 px-1.5 py-px text-[10px] font-bold bg-zinc-200/60 text-zinc-500 rounded">
              {tables.length} 张表
            </span>
          )}
        </div>

        {/* Body */}
        {loadingSchema ? (
          <div className="flex items-center justify-center flex-1 text-zinc-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> 连接数据库，读取表结构...
          </div>
        ) : schemaError ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <AlertCircle className="w-6 h-6 text-red-300" />
            <p className="text-sm font-medium text-red-400">
              {schemaError instanceof Error ? schemaError.message : "获取表结构失败"}
            </p>
            <p className="text-xs text-zinc-400">请确认网关已连接且数据源配置正确</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-72 shrink-0 border-r border-zinc-100 flex flex-col bg-zinc-50/30">
              <TableSidebar
                tables={tables}
                selected={resolvedSelected}
                search={tableSearch}
                onSearch={setTableSearch}
                onSelect={handleSelectTable}
                isSQLServer={isSQLServer}
              />
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {currentTable ? (
                <>
                  {/* Tab bar */}
                  <div className="flex items-stretch border-b border-zinc-100 shrink-0 bg-zinc-50/40">
                    <div className="flex items-center pl-4 pr-3 border-r border-zinc-100 shrink-0">
                      <span className="text-[11px] font-bold text-zinc-700 font-mono">
                        {isSQLServer && resolvedSelected ? (
                          <>
                            <span className="text-zinc-400 font-normal">{splitSchemaTable(resolvedSelected).schema} · </span>
                            {selectedDisplayName}
                          </>
                        ) : selectedDisplayName}
                      </span>
                    </div>
                    {(["schema", "data"] as Tab[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                          "flex items-center gap-1.5 px-4 text-[11px] font-bold border-b-2 transition-colors",
                          tab === t
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-zinc-400 hover:text-zinc-600",
                        )}
                      >
                        {t === "schema"
                          ? <><Columns3 className="w-3 h-3" />字段定义<span className="opacity-60">({currentTable.columns.length})</span></>
                          : <><Rows3 className="w-3 h-3" />数据预览{rows.length > 0 && <span className="opacity-60">({rows.length})</span>}</>
                        }
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-auto">
                    {tab === "schema" ? (
                      <table className="w-full text-[11px] border-collapse">
                        <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
                          <tr>
                            <th className="text-right px-3 py-2 font-bold text-zinc-400 w-8">#</th>
                            <th className="text-left px-3 py-2 font-bold text-zinc-500">字段名</th>
                            <th className="text-left px-3 py-2 font-bold text-zinc-500">类型</th>
                            <th className="text-left px-3 py-2 font-bold text-zinc-500">约束</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTable.columns.map((col, i) => (
                            <tr key={col.name} className="border-b border-zinc-50 hover:bg-blue-50/30 transition-colors">
                              <td className="px-3 py-2 text-right text-zinc-300 tabular-nums select-none">{i + 1}</td>
                              <td className="px-3 py-2 font-mono font-bold text-zinc-800">{col.name}</td>
                              <td className={cn("px-3 py-2 font-mono text-[10px]", typeColor(col.type))}>
                                {col.type || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {!col.nullable && (
                                  <span className="inline-block px-1.5 py-px text-[9px] font-bold rounded bg-zinc-100 text-zinc-500 tracking-wide">NOT NULL</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : loadingRows ? (
                      <div className="flex items-center justify-center h-32 text-zinc-400 text-xs gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> 查询数据...
                      </div>
                    ) : rowsError ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-300" />
                        <p className="text-xs text-red-400">
                          {rowsError instanceof Error ? rowsError.message : "预览失败"}
                        </p>
                      </div>
                    ) : rows.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-zinc-300 text-xs">该表暂无数据</div>
                    ) : (
                      <table className="text-[11px] border-collapse min-w-full">
                        <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
                          <tr>
                            <th className="px-3 py-2 text-right text-zinc-300 font-bold select-none w-10 border-r border-zinc-100">#</th>
                            {dataColumns.map(col => {
                              const def = currentTable.columns.find(c => c.name === col)
                              return (
                                <th key={col} className="px-3 py-2 text-left font-bold text-zinc-500 whitespace-nowrap border-r border-zinc-100 last:border-r-0">
                                  <span className="font-mono">{col}</span>
                                  {def && (
                                    <span className={cn("ml-1.5 text-[9px] font-normal opacity-70", typeColor(def.type))}>
                                      {def.type}
                                    </span>
                                  )}
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i} className="border-b border-zinc-50 hover:bg-blue-50/20 transition-colors">
                              <td className="px-3 py-1.5 text-right text-zinc-300 tabular-nums select-none border-r border-zinc-100">{i + 1}</td>
                              {dataColumns.map(col => {
                                const def = currentTable.columns.find(c => c.name === col)
                                const isNum = def ? isNumericType(def) : typeof row[col] === "number"
                                return (
                                  <td
                                    key={col}
                                    className={cn(
                                      "px-3 py-1.5 font-mono whitespace-nowrap border-r border-zinc-100 last:border-r-0",
                                      isNum ? "text-right text-emerald-700" : "text-zinc-700",
                                    )}
                                  >
                                    <CellValue val={row[col]} />
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Status bar */}
                  <div className="shrink-0 px-4 py-1.5 border-t border-zinc-100 bg-zinc-50/60 flex items-center gap-4 text-[10px] text-zinc-400">
                    {tab === "schema" ? (
                      <span>{currentTable.columns.length} 个字段</span>
                    ) : !loadingRows && !rowsError && rows.length > 0 ? (
                      <>
                        <span>{rows.length} 行</span>
                        <span>·</span>
                        <span>{dataColumns.length} 列</span>
                        <span>·</span>
                        <span>最多显示 100 行</span>
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-300 gap-2">
                  <Table2 className="w-8 h-8 opacity-30" />
                  <p className="text-xs">从左侧选择一张表</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
