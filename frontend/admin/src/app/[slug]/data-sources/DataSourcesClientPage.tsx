"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Plus, Search, Trash2, Server, Pencil, Table2, PlugZap, Lock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useTenant } from "@/providers/TenantProvider"
import { useDataSources, useDeleteDataSource, useGateways } from "@/hooks"
import type { DataSource } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { DB_TYPES } from "@/lib/constants"
import { CardSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { Pager } from "@/components/ui/pager"
import { showConfirm } from "@/store/useConfirmStore"
import { DataBrowserDialog } from "./DataBrowserDialog"
import { ErrorBoundary } from "@/components/ui/error-boundary"

// ─── DB type icon ─────────────────────────────────────────────────────────────

function DbTypeIcon({ type }: { type: string }) {
  const bg = DB_TYPES[type as keyof typeof DB_TYPES]?.iconBg ?? '#f4f4f5'
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-black/5"
      style={{ background: bg }}
    >
      <Image src={`/db-icons/${type}.svg`} alt={type} width={24} height={24} className="object-contain" unoptimized />
    </div>
  )
}

// ─── DSN preview ──────────────────────────────────────────────────────────────

function parseDsnPreview(type: string, dsn: string): { host: string; db: string } {
  if (!dsn) return { host: '-', db: '-' }
  try {
    if (type === 'mysql' || type === 'starrocks' || type === 'doris') {
      const m = dsn.match(/@(?:tcp|udp)?\(([^)]+)\)\/([^?]*)/)
      if (m) return { host: m[1], db: m[2] || '-' }
    }
    if (type === 'postgres') {
      const url = new URL(dsn)
      return { host: `${url.hostname}:${url.port || '5432'}`, db: url.pathname.slice(1) }
    }
    if (type === 'sqlserver') {
      const url = new URL(dsn)
      return { host: `${url.hostname}:${url.port || '1433'}`, db: url.searchParams.get('database') || '-' }
    }
    if (type === 'sqlite') return { host: 'local', db: dsn }
  } catch { /* ignore */ }
  return { host: '-', db: '-' }
}

function EnvRow({ type, dsn, label, colors }: { type: string; dsn: string; label: string; colors: string }) {
  const { host, db } = parseDsnPreview(type, dsn)
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-10 text-center px-1 py-0.5 rounded text-[9px] font-black border uppercase shrink-0", colors)}>
        {label}
      </span>
      <span className="font-mono text-[11px] text-zinc-500 truncate">{host} / {db}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DataSourcesClientPage() {
  const activeTenant = useTenant()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [keyword, setKeyword] = useState("")
  const { dataSources, pagination, isLoading, refetch } = useDataSources(activeTenant, { page, size, keyword })
  const { gateways } = useGateways(activeTenant, { is_pager: 0 })
  const deleteMutation = useDeleteDataSource(activeTenant)
  const [browseDS, setBrowseDS] = useState<DataSource | null>(null)

  const handleDelete = async (ds: DataSource) => {
    if (!await showConfirm(`确定要删除数据源 "${ds.name}" 吗？`)) return
    deleteMutation.mutate(ds.id!)
  }

  const gwName = (id?: number) => gateways.find(g => g.id === id)?.name ?? '-'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">数据源管理</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">通过网关节点实现跨网络数据库安全接入</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="h-9 px-4 rounded-lg text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 刷新
          </Button>
          <Link href={`/${activeTenant}/data-sources/new`}>
            <Button className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> 新建
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-zinc-100 rounded-lg p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="通过名称或类型检索数据源..."
            className="pl-9 h-9 text-xs bg-zinc-50 border-zinc-100 rounded-lg"
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton count={3} />
      ) : dataSources.length === 0 && !keyword ? (
        <EmptyState icon={PlugZap} title="暂无数据源" description="点击「新建」接入第一个数据源" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {dataSources.map(ds => {
            const prodEnv   = ds.envs?.find(e => e.env === 'prod')
            const devEnv    = ds.envs?.find(e => e.env === 'dev')
            const singleEnv = ds.envs?.[0]
            const isDual    = ds.is_dual
            const { host, db } = parseDsnPreview(ds.type, (isDual ? prodEnv : singleEnv)?.dsn ?? '')

            return (
              <Card
                key={ds.id}
                className="bg-white border-zinc-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-600/30 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <DbTypeIcon type={ds.type} />
                    <div className="flex items-center gap-1.5">
                      {ds.is_platform && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold text-zinc-500">
                          <Lock className="w-2.5 h-2.5" /> 内置
                        </span>
                      )}
                      {isDual && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-violet-50 text-violet-600 border-violet-100 uppercase tracking-tight">
                          双环境
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-zinc-50 text-zinc-500 border-zinc-100 uppercase tracking-tight">
                        {DB_TYPES[ds.type as keyof typeof DB_TYPES]?.label ?? ds.type}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-[15px] font-bold text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight leading-tight mb-0.5">
                    {ds.name}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium mb-4">
                    ID {ds.id} · {new Date(ds.created_at).toLocaleDateString()}
                  </p>

                  {isDual ? (
                    <div className="space-y-2">
                      {devEnv  && <EnvRow type={ds.type} dsn={devEnv.dsn  ?? ''} label="DEV"  colors="bg-emerald-50 text-emerald-600 border-emerald-100" />}
                      {prodEnv && <EnvRow type={ds.type} dsn={prodEnv.dsn ?? ''} label="PROD" colors="bg-blue-50 text-blue-600 border-blue-100" />}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span className="text-zinc-300 font-bold w-7 shrink-0">HOST</span>
                        <span className="font-mono truncate">{host}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span className="text-zinc-300 font-bold w-7 shrink-0">DB</span>
                        <span className="font-mono truncate">{db}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 truncate min-w-0">
                    <Server className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">
                      {isDual
                        ? `${gwName(devEnv?.gateway_id)} / ${gwName(prodEnv?.gateway_id)}`
                        : gwName(singleEnv?.gateway_id)
                      }
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost" size="icon"
                      className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                      title="浏览数据"
                      onClick={() => setBrowseDS(ds)}
                    >
                      <Table2 className="w-3.5 h-3.5" />
                    </Button>
                    {!ds.is_platform && (
                      <Link href={`/${activeTenant}/data-sources/edit/${ds.id}`}>
                        <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                    {!ds.is_platform && (
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(ds)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}

          <Link href={`/${activeTenant}/data-sources/new`} className="group">
            <div className="border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center p-6 bg-zinc-50/20 hover:bg-white hover:border-blue-600/30 hover:shadow-sm transition-all cursor-pointer h-full min-h-[220px]">
              <div className="w-11 h-11 rounded-xl border border-zinc-100 flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                <Plus className="w-5 h-5 text-zinc-300 group-hover:text-white" />
              </div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide">新建</p>
            </div>
          </Link>
        </div>
      )}

      <Pager page={page} size={size} total={pagination?.total ?? 0} onPageChange={setPage} onSizeChange={setSize} />

      {browseDS && (
        <ErrorBoundary>
          <DataBrowserDialog
            open={!!browseDS}
            onClose={() => setBrowseDS(null)}
            slug={activeTenant}
            ds={browseDS}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}
