"use client"

import { useState } from "react"
import Image from "next/image"
import { Table2, Loader2, AlertCircle, Columns3, Rows3 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { DataSource } from "@/lib/api-client"
import { useDataSourceSchema, useDataSourcePreview } from "@/hooks"
import { DB_TYPES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { TableSidebar, splitSchemaTable } from "./DataBrowserSchemaTree"
import { SchemaTab, DataTab } from "./DataBrowserTable"

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  ds: DataSource
}

type Tab = "schema" | "data"

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
  const dataColumns = rows.length > 0
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
        className="w-[96vw] max-w-none p-0 overflow-hidden flex flex-col gap-0 rounded-2xl border-border"
        style={{ height: "92vh" }}
      >
        <DialogTitle className="sr-only">数据浏览 — {ds.name}</DialogTitle>

        {/* Title bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-subtle bg-zinc-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white border border-border shadow-sm">
              <Image src={`/db-icons/${ds.type}.svg`} alt={ds.type} width={16} height={16} className="object-contain" unoptimized />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground leading-tight">{ds.name}</p>
              <p className="text-2xs text-muted-foreground leading-tight">{dbLabel}</p>
            </div>
          </div>
          {!loadingSchema && tables.length > 0 && (
            <span className="ml-1 px-1.5 py-px text-2xs font-bold bg-zinc-200/60 text-muted-foreground rounded">
              {tables.length} 张表
            </span>
          )}
        </div>

        {/* Body */}
        {loadingSchema ? (
          <div className="flex items-center justify-center flex-1 text-muted-foreground text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> 连接数据库，读取表结构...
          </div>
        ) : schemaError ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <AlertCircle className="w-6 h-6 text-red-300" />
            <p className="text-sm font-medium text-red-400">
              {schemaError instanceof Error ? schemaError.message : "获取表结构失败"}
            </p>
            <p className="text-xs text-muted-foreground">请确认网关已连接且数据源配置正确</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-72 shrink-0 border-r border-border-subtle flex flex-col bg-zinc-50/30">
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
                  <div className="flex items-stretch border-b border-border-subtle shrink-0 bg-zinc-50/40">
                    <div className="flex items-center pl-4 pr-3 border-r border-border-subtle shrink-0">
                      <span className="text-xs font-bold text-zinc-700 font-mono">
                        {isSQLServer && resolvedSelected ? (
                          <>
                            <span className="text-muted-foreground font-normal">{splitSchemaTable(resolvedSelected).schema} · </span>
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
                          "flex items-center gap-1.5 px-4 text-xs font-bold border-b-2 transition-colors",
                          tab === t
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-zinc-600",
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
                      <SchemaTab columns={currentTable.columns} />
                    ) : (
                      <DataTab
                        columns={currentTable.columns}
                        dataColumns={dataColumns}
                        rows={rows as Record<string, unknown>[]}
                        isLoading={loadingRows}
                        error={rowsError as Error | null}
                      />
                    )}
                  </div>

                  {/* Status bar */}
                  <div className="shrink-0 px-4 py-1.5 border-t border-border-subtle bg-zinc-50/60 flex items-center gap-4 text-2xs text-muted-foreground">
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
