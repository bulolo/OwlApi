"use client"

import { useState } from "react"
import { Table2, Search, ChevronRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import type { SchemaTable } from "@/lib/api-client"
import { cn } from "@/lib/utils"

// ── Schema grouping (SQL Server "schema.table" format) ────────────────────────

export function splitSchemaTable(name: string): { schema: string; table: string } {
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

// ── TableSidebar ──────────────────────────────────────────────────────────────

interface TableSidebarProps {
  tables: SchemaTable[]
  selected: string | null
  search: string
  onSearch: (v: string) => void
  onSelect: (name: string) => void
  isSQLServer: boolean
}

export function TableSidebar({
  tables,
  selected,
  search,
  onSearch,
  onSelect,
  isSQLServer,
}: TableSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (schema: string) =>
    setExpanded(prev => prev.has(schema) ? new Set() : new Set([schema]))

  const filtered = search ? tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : null
  const groups = groupBySchema(tables)

  const rowCls = (name: string) => cn(
    "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2",
    selected === name ? "bg-primary text-white" : "text-zinc-600 hover:bg-zinc-100",
  )
  const iconCls = (name: string) => cn("w-3 h-3 shrink-0", selected === name ? "text-white/70" : "text-muted-foreground")
  const countCls = (name: string) => cn("text-2xs shrink-0 tabular-nums", selected === name ? "text-white/70" : "text-muted-foreground")

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
      <div className="px-2.5 py-2 border-b border-border-subtle shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="过滤表名..."
            className="pl-6 h-7 text-xs bg-white border-border rounded focus-visible:ring-1 focus-visible:ring-primary/20"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {filtered !== null ? (
            filtered.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">无匹配</p>
              : renderFlatList(filtered)
          ) : isSQLServer ? (
            groups.map(({ schema, tables: schemaTables }) => (
              <div key={schema}>
                <button
                  onClick={() => toggle(schema)}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-zinc-100 transition-colors"
                >
                  <ChevronRight className={cn("w-3 h-3 shrink-0 transition-transform text-muted-foreground", expanded.has(schema) && "rotate-90")} />
                  <span className="flex-1 min-w-0 truncate uppercase tracking-wide">{schema || "(default)"}</span>
                  <span className="text-2xs font-normal text-muted-foreground shrink-0">{schemaTables.length}</span>
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
