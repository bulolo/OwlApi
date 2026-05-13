"use client"

import { useState } from "react"
import { Server, Plus, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTenant } from "@/providers/TenantProvider"
import { useGateways, useDeleteGateway } from "@/hooks"
import { apiGetGateway, type Gateway } from "@/lib/api-client"
import { Input } from "@/components/ui/input"
import { ListSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { Pager } from "@/components/ui/pager"
import { toast } from "sonner"
import { showConfirm } from "@/store/useConfirmStore"
import { GatewayCard } from "./_components/GatewayCard"
import { GatewayDeployPanel } from "./_components/GatewayDeployPanel"

export default function GatewaysClientPage() {
  const activeTenant = useTenant()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [keyword, setKeyword] = useState("")
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

  const formatTime = (ts: string) => {
    if (!ts) return "-"
    const d = new Date(ts)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return `${diff} 秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    return d.toLocaleDateString()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">网关节点管理</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">网关节点部署于数据库所在机器，提供安全的内网数据索引能力。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-4 rounded-lg border-zinc-200 text-xs font-bold shadow-sm" onClick={() => refetch()}>
            刷新
          </Button>
          <Link href={`/${activeTenant}/gateways/new`}>
            <Button className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" />
              安装新节点
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-zinc-100 rounded-lg p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="搜索网关节点..." className="pl-9 h-9 text-xs bg-zinc-50 border-zinc-100 rounded-lg" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1) }} />
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : gateways.length === 0 ? (
        <EmptyState icon={Server} title={keyword ? "无匹配节点" : "暂无网关节点"} description={keyword ? "尝试其他关键词" : "点击「安装新节点」创建第一个网关"} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gateways.map((gw) => (
            <GatewayCard
              key={gw.id}
              gateway={gw}
              formatTime={formatTime}
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
