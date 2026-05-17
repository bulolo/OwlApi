"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Plus, Search, Trash2, Server, Pencil, Table2, PlugZap, Lock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useTenant } from "@/providers/TenantProvider"
import { useDataSources, useDeleteDataSource, useGateways, usePaginationState } from "@/hooks"
import type { DataSource } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { DB_TYPES } from "@/lib/constants"
import { parseDsnPreview } from "@/lib/database-helpers"
import { CardSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { Pager } from "@/components/ui/pager"
import { showConfirm } from "@/store/useConfirmStore"
import { DataBrowserDialog } from "./_components/DataBrowserDialog"
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


function EnvRow({ type, dsn, label, colors }: { type: string; dsn: string; label: string; colors: string }) {
  const { host, db } = parseDsnPreview(type, dsn)
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-10 text-center px-1 py-0.5 rounded text-2xs font-black border uppercase shrink-0", colors)}>
        {label}
      </span>
      <span className="font-mono text-xs text-muted-foreground truncate">{host} / {db}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DataSources() {
  const activeTenant = useTenant()
  const { page, size, keyword, setPage, setSize, onSearch } = usePaginationState(10)
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">数据源管理</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">通过网关节点实现跨网络数据库安全接入</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="h-9 px-4 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-zinc-100" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 刷新
          </Button>
          <Link href={`/${activeTenant}/data-sources/new`}>
            <Button className="h-9 px-4 text-xs font-bold shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> 新建
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-lg p-3 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="通过名称或类型检索数据源..."
            className="pl-9 h-9 text-xs bg-zinc-50 border-border-subtle rounded-lg"
            value={keyword}
            onChange={e => onSearch(e.target.value)}
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
                className="bg-white border-border-subtle rounded-xl shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <DbTypeIcon type={ds.type} />
                    <div className="flex items-center gap-1.5">
                      {ds.is_platform && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 border border-border rounded text-2xs font-bold text-muted-foreground">
                          <Lock className="w-2.5 h-2.5" /> 内置
                        </span>
                      )}
                      {isDual && (
                        <span className="px-2 py-0.5 rounded-full text-2xs font-bold border bg-violet-50 text-violet-600 border-violet-100 uppercase tracking-tight">
                          双环境
                        </span>
                      )}
                      <span className={cn("px-2 py-0.5 rounded-full text-2xs font-bold border uppercase tracking-tight", DB_TYPES[ds.type as keyof typeof DB_TYPES]?.color ?? "bg-zinc-50 text-muted-foreground border-border-subtle")}>
                        {DB_TYPES[ds.type as keyof typeof DB_TYPES]?.label ?? ds.type}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors tracking-tight leading-tight mb-0.5">
                    {ds.name}
                  </h3>
                  <p className="text-2xs text-muted-foreground font-medium mb-4">
                    ID {ds.id} · {new Date(ds.created_at).toLocaleDateString()}
                  </p>

                  {isDual ? (
                    <div className="space-y-2">
                      {devEnv  && <EnvRow type={ds.type} dsn={devEnv.dsn  ?? ''} label="DEV"  colors="bg-emerald-50 text-emerald-600 border-emerald-100" />}
                      {prodEnv && <EnvRow type={ds.type} dsn={prodEnv.dsn ?? ''} label="PROD" colors="bg-primary/10 text-primary border-primary/20" />}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xs font-bold text-muted-foreground shrink-0">主机</span>
                        <span className="text-xs font-mono text-foreground truncate">{host || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xs font-bold text-muted-foreground shrink-0">库名</span>
                        <span className="text-xs font-mono text-foreground truncate">{db || '-'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-border-subtle bg-zinc-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-2xs font-bold text-muted-foreground truncate min-w-0">
                    <Server className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <span className="truncate">
                      {isDual
                        ? `${gwName(devEnv?.gateway_id)} / ${gwName(prodEnv?.gateway_id)}`
                        : gwName(singleEnv?.gateway_id)
                      }
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost" size="icon-xs"
                      className="rounded-lg hover:bg-primary/10 hover:text-primary"
                      title="浏览数据"
                      onClick={() => setBrowseDS(ds)}
                    >
                      <Table2 className="w-3.5 h-3.5" />
                    </Button>
                    {!ds.is_platform && (
                      <Link href={`/${activeTenant}/data-sources/edit/${ds.id}`}>
                        <Button variant="ghost" size="icon-xs" className="rounded-lg hover:bg-primary/10 hover:text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                    {!ds.is_platform && (
                      <Button
                        variant="ghost" size="icon-xs"
                        className="rounded-lg hover:bg-red-50 hover:text-red-500"
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
            <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 bg-zinc-50/20 hover:bg-white hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer h-full min-h-[220px]">
              <div className="w-11 h-11 rounded-xl border border-border-subtle flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <Plus className="w-5 h-5 text-zinc-300 group-hover:text-white" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">新建</p>
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
