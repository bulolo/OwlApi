"use client"

import { useState } from "react"
import { Server, Plus, Search, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTenant } from "@/providers/TenantProvider"
import { useGateways, useDeleteGateway, usePaginationState } from "@/hooks"
import { apiGetGateway, type Gateway } from "@/lib/api-client"
import { Input } from "@/components/ui/input"
import { ListSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { Pager } from "@/components/ui/pager"
import { toast } from "sonner"
import { showConfirm } from "@/store/useConfirmStore"
import { GatewayCard } from "./_components/GatewayCard"
import { GatewayDeployPanel } from "./_components/GatewayDeployPanel"
import { formatRelativeTime } from "@/lib/database-helpers"

export default function Gateways() {
  const activeTenant = useTenant()
  const { page, size, keyword, setPage, setSize, onSearch } = usePaginationState(10)
  const { gateways, pagination, isLoading, refetch } = useGateways(activeTenant, { page, size, keyword })
  const deleteMutation = useDeleteGateway(activeTenant)
  const [detail, setDetail] = useState<Gateway | null>(null)

  const handleDelete = async (gw: Gateway) => {
    if (!await showConfirm(`确定要删除网关节点 "${gw.name}" 吗？`)) return
    deleteMutation.mutate(gw.id, { onSuccess: () => setDetail(null) })
  }

  const handleViewDeploy = async (gw: Gateway) => {
    try {
      const full = await apiGetGateway(activeTenant, gw.id)
      setDetail(full)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "获取详情失败")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">网关节点管理</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">网关节点部署于数据库所在机器，提供安全的内网数据索引能力。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="h-9 px-4 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-zinc-100" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 刷新
          </Button>
          <Link href={`/${activeTenant}/gateways/new`}>
            <Button className="h-9 px-4 text-xs font-bold shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              新建
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-lg p-3 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索网关节点..." className="pl-9 h-9 text-xs bg-zinc-50 border-border-subtle rounded-lg" value={keyword} onChange={(e) => onSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : gateways.length === 0 ? (
        <EmptyState icon={Server} title={keyword ? "无匹配节点" : "暂无网关节点"} description={keyword ? "尝试其他关键词" : "点击「新建」添加第一个网关节点"} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gateways.map((gw) => (
            <GatewayCard
              key={gw.id}
              gateway={gw}
              formatTime={formatRelativeTime}
              onViewDeploy={handleViewDeploy}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Pager page={page} size={size} total={pagination?.total ?? 0} onPageChange={setPage} onSizeChange={setSize} />

      {detail && (
        <GatewayDeployPanel gateway={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
