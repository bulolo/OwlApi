"use client"

import { useState } from "react"
import { Server, Plus, Globe, Trash2, Eye, Copy, Check, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/useUIStore"
import { useGateways, useDeleteGateway } from "@/hooks"
import { apiGetGateway, type Gateway } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ListSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { Pager } from "@/components/ui/pager"
import { toast } from "sonner"

export default function GatewaysClientPage() {
  const { activeTenant } = useUIStore()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState("")
  const { gateways, pagination, isLoading, refetch } = useGateways(activeTenant, { page, size: 10, keyword })
  const deleteMutation = useDeleteGateway(activeTenant)
  const [detail, setDetail] = useState<Gateway | null>(null)
  const [copied, setCopied] = useState(false)

  const handleDelete = async (gw: Gateway) => {
    if (!confirm(`确定要删除网关节点 "${gw.name}" 吗？`)) return
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

  const composeYaml = detail ? `services:
  gateway:
    image: registry.cn-hangzhou.aliyuncs.com/owlapi/gateway:latest
    container_name: owlapi_gateway
    restart: unless-stopped
    environment:
      - OWLAPI_SERVER_URL=dns:///your-server:9090
      - OWLAPI_GATEWAY_ID=${detail.id}
      - OWLAPI_GATEWAY_TOKEN=${detail.token}
      - OWLAPI_TENANT_ID=${detail.tenant_id}
      - OWLAPI_LOG_LEVEL=info
      - TZ=Asia/Shanghai` : ""

  const handleCopy = () => {
    navigator.clipboard.writeText(composeYaml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            <div key={gw.id} className="bg-white border border-zinc-100 rounded-lg p-5 flex flex-col shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center border transition-colors",
                    gw.status === "online" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-zinc-50 text-zinc-400 border-zinc-100"
                  )}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight">{gw.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400 font-medium">
                      <Globe className="w-3 h-3" />
                      {gw.ip || "-"} {gw.version && `• ${gw.version}`}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center shadow-sm",
                  gw.status === "online"
                    ? "text-emerald-600 border-emerald-100 bg-emerald-50"
                    : "text-zinc-400 border-zinc-100 bg-zinc-50"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", gw.status === "online" ? "bg-emerald-500" : "bg-zinc-300")} />
                  {gw.status === "online" ? "Online" : "Offline"}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 border-dashed">
                <div className="text-[11px] font-medium text-zinc-400">
                  最后心跳: {formatTime(gw.last_seen)}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold text-zinc-500 hover:text-blue-600" onClick={() => handleViewDeploy(gw)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> 部署信息
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => handleDelete(gw)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager page={page} size={10} total={pagination?.total ?? 0} onPageChange={setPage} />

      {detail && (
        <div className="bg-white border border-zinc-100 rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">部署信息 — {detail.name}</h3>
            <Button variant="ghost" size="sm" className="text-xs text-zinc-400" onClick={() => setDetail(null)}>关闭</Button>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-emerald-400 relative">
            <div className="absolute top-3 right-3">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <pre className="whitespace-pre pr-12 text-[13px]">{composeYaml}</pre>
          </div>
          <p className="text-[11px] text-zinc-400">
            将 <code className="bg-zinc-100 px-1 rounded">your-server:9090</code> 替换为 Control Plane 的实际地址，然后执行 <code className="bg-zinc-100 px-1 rounded">docker compose up -d</code>
          </p>
        </div>
      )}
    </div>
  )
}
