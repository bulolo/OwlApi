"use client"

import { Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SchemaColumn } from "@/lib/api-client"

// ── Type helpers ──────────────────────────────────────────────────────────────

export function typeColor(type: string): string {
  const t = type.toLowerCase()
  if (/int|bigint|serial|numeric|decimal|float|double|real/.test(t)) return "text-emerald-600"
  if (/bool/.test(t)) return "text-purple-600"
  if (/date|time|timestamp/.test(t)) return "text-amber-600"
  if (/text|varchar|char|string|clob/.test(t)) return "text-sky-600"
  return "text-muted-foreground"
}

export function isNumericType(col: SchemaColumn): boolean {
  return /int|bigint|serial|numeric|decimal|float|double|real/.test(col.type.toLowerCase())
}

export function CellValue({ val }: { val: unknown }) {
  if (val == null)
    return <span className="inline-block px-1.5 py-px text-2xs font-mono rounded bg-zinc-100 text-muted-foreground leading-tight">NULL</span>
  if (typeof val === "boolean")
    return <span className={val ? "text-emerald-600 font-bold" : "text-red-400 font-bold"}>{String(val)}</span>
  const str = String(val)
  if (str.length > 80)
    return <span title={str} className="cursor-default">{str.slice(0, 80)}<span className="text-muted-foreground">…</span></span>
  return <>{str}</>
}

// ── Schema tab (column definitions) ──────────────────────────────────────────

interface SchemaTabProps {
  columns: SchemaColumn[]
}

export function SchemaTab({ columns }: SchemaTabProps) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-border">
        <tr>
          <th className="text-right px-3 py-2 font-bold text-muted-foreground w-8">#</th>
          <th className="text-left px-3 py-2 font-bold text-muted-foreground">字段名</th>
          <th className="text-left px-3 py-2 font-bold text-muted-foreground">类型</th>
          <th className="text-left px-3 py-2 font-bold text-muted-foreground">约束</th>
        </tr>
      </thead>
      <tbody>
        {columns.map((col, i) => (
          <tr key={col.name} className="border-b border-border-subtle hover:bg-muted/40 transition-colors">
            <td className="px-3 py-2 text-right text-zinc-300 tabular-nums select-none">{i + 1}</td>
            <td className="px-3 py-2 font-mono font-bold text-foreground">{col.name}</td>
            <td className={cn("px-3 py-2 font-mono text-2xs", typeColor(col.type))}>
              {col.type || "—"}
            </td>
            <td className="px-3 py-2">
              {!col.nullable && (
                <span className="inline-block px-1.5 py-px text-2xs font-bold rounded bg-zinc-100 text-muted-foreground tracking-wide">NOT NULL</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Data preview tab ──────────────────────────────────────────────────────────

interface DataTabProps {
  columns: SchemaColumn[]
  dataColumns: string[]
  rows: Record<string, unknown>[]
  isLoading: boolean
  error: Error | null
}

export function DataTab({ columns, dataColumns, rows, isLoading, error }: DataTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> 查询数据...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-1.5">
        <AlertCircle className="w-4 h-4 text-red-300" />
        <p className="text-xs text-red-400">
          {error instanceof Error ? error.message : "预览失败"}
        </p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-300 text-xs">该表暂无数据</div>
    )
  }

  return (
    <table className="text-xs border-collapse min-w-full">
      <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-border">
        <tr>
          <th className="px-3 py-2 text-right text-zinc-300 font-bold select-none w-10 border-r border-border-subtle">#</th>
          {dataColumns.map(col => {
            const def = columns.find(c => c.name === col)
            return (
              <th key={col} className="px-3 py-2 text-left font-bold text-muted-foreground whitespace-nowrap border-r border-border-subtle last:border-r-0">
                <span className="font-mono">{col}</span>
                {def && (
                  <span className={cn("ml-1.5 text-2xs font-normal opacity-70", typeColor(def.type))}>
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
          <tr key={i} className="border-b border-border-subtle hover:bg-muted/40 transition-colors">
            <td className="px-3 py-1.5 text-right text-zinc-300 tabular-nums select-none border-r border-border-subtle">{i + 1}</td>
            {dataColumns.map(col => {
              const def = columns.find(c => c.name === col)
              const isNum = def ? isNumericType(def) : typeof row[col] === "number"
              return (
                <td
                  key={col}
                  className={cn(
                    "px-3 py-1.5 font-mono whitespace-nowrap border-r border-border-subtle last:border-r-0",
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
  )
}
