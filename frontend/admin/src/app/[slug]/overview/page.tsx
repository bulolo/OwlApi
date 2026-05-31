"use client"

import { useState } from "react"
import { Activity, Server, ArrowUpRight, ArrowDownRight, Box, FolderGit2, Loader2 } from "lucide-react"
import { useTenant } from "@/providers/TenantProvider"
import { useGateways, useProjects, useDataSources, useScripts } from "@/hooks"
import { useGetOverviewTraffic, useGetOverviewActivity } from "@/lib/sdk/overview"
import type { TrafficBucketResp, ActivityEventResp } from "@/lib/sdk"

// 事件严重度 → 时间线圆点颜色 / 类型标签中文。
const SEVERITY_DOT: Record<string, string> = {
  info: "bg-primary/80",
  warning: "bg-amber-500",
  error: "bg-red-500",
}
const TYPE_LABEL: Record<string, string> = {
  api: "API",
  error: "错误",
  slow: "慢查询",
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 60) return "刚刚"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  return `${d} 天前`
}

// UI 上的范围标签 → 后端 range 参数（24h / 7d / 30d）。
const RANGES = [
  { ui: "24H", api: "24h", label: "过去 24 小时的 API 请求趋势 (按小时)" },
  { ui: "7D", api: "7d", label: "过去 7 天的流量趋势 (按天)" },
  { ui: "30D", api: "30d", label: "过去 30 天的流量趋势 (按天)" },
] as const

export default function OverviewPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["api"]>("24h")
  const activeTenant = useTenant()
  // 概览是实时看板：每次进入页面都强制重拉（refetchOnMount: "always"），
  // 覆盖全局 5min staleTime，避免刚产生新数据、切回概览却看到旧缓存。
  const { data: traffic, isLoading: trafficLoading } = useGetOverviewTraffic(
    activeTenant,
    { range },
    { query: { refetchOnMount: "always" } },
  )
  const buckets = traffic?.buckets ?? []
  const rangeLabel = RANGES.find(r => r.api === range)?.label ?? ""

  const { data: activity, isLoading: activityLoading } = useGetOverviewActivity(
    activeTenant,
    { limit: 6 },
    { query: { refetchOnMount: "always" } },
  )
  const events: ActivityEventResp[] = activity?.list ?? []
  const { gateways, pagination: gwPagination } = useGateways(activeTenant, { is_pager: 0 })
  const { pagination: projPagination } = useProjects(activeTenant, { is_pager: 0 })
  const { pagination: dsPagination } = useDataSources(activeTenant, { is_pager: 0 })
  const { pagination: scriptPagination } = useScripts(activeTenant, { is_pager: 0 })

  const onlineGw = gateways.filter(g => g.status === 'online').length
  const gwTotal = gwPagination?.total ?? gateways.length
  const gatewayLabel = `${onlineGw}/${gwTotal}`
  const gatewayStatus = onlineGw === gwTotal && gwTotal > 0 ? '全部在线' : `${onlineGw} 在线`
  const projectCount = projPagination?.total ?? 0
  const dsCount = dsPagination?.total ?? 0
  const scriptCount = scriptPagination?.total ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">概览</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">查看当前组织的 API 资产运行状态、流量统计及最新动态。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="网关节点" value={gatewayLabel} change={gatewayStatus} trend="up" icon={Server} color="blue" />
        <StatCard title="数据源" value={String(dsCount)} change="已接入" trend="up" icon={Activity} color="indigo" />
        <StatCard title="项目" value={String(projectCount)} change={`${dsCount} 数据源`} trend="up" icon={FolderGit2} color="amber" />
        <StatCard title="脚本" value={String(scriptCount)} change="已配置" trend="up" icon={Box} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-border-subtle shadow-card p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-foreground">流量趋势</h3>
              <p className="text-2xs text-muted-foreground font-bold uppercase tracking-tight mt-0.5">{rangeLabel}</p>
            </div>
            <div className="flex gap-1 bg-zinc-50 p-1 rounded-lg border border-border-subtle">
              {RANGES.map((r) => (
                <button
                  key={r.api}
                  onClick={() => setRange(r.api)}
                  className={`text-2xs px-3 py-1 rounded-lg font-black tracking-tight uppercase transition-all ${
                    range === r.api
                      ? "bg-white shadow-sm border border-border text-foreground"
                      : "text-muted-foreground hover:bg-white/50 border border-transparent"
                  }`}
                >
                  {r.ui}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[280px] w-full relative">
            {trafficLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (traffic?.total ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Activity className="w-8 h-8 text-zinc-200" />
                <p className="text-xs text-muted-foreground">该时间段暂无 API 调用</p>
              </div>
            ) : (
              <TrafficChart buckets={buckets} bucket={traffic?.bucket ?? "hour"} />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-50 border-dashed">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary/80 shadow-glow" />
                <span className="text-xs font-bold text-zinc-600">正常请求</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-xs font-bold text-muted-foreground">错误请求</span>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs text-muted-foreground font-medium">
              <span>区间总量: <span className="text-foreground font-black">{(traffic?.total ?? 0).toLocaleString()}</span></span>
              <span>峰值: <span className="text-foreground font-black">
                {traffic?.peak ?? 0} {traffic?.bucket === "day" ? "req/day" : "req/h"}
              </span></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border-subtle shadow-card p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">最近动态</h3>
          {activityLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Activity className="w-8 h-8 text-zinc-200" />
              <p className="text-xs text-muted-foreground">暂无动态——发布接口或产生调用后会显示在这里</p>
            </div>
          ) : (
            <div className="space-y-5 relative max-h-[360px] overflow-y-auto pr-1 before:absolute before:left-[15px] before:top-2 before:h-full before:w-[2px] before:bg-zinc-100">
              {events.map((item, i) => (
                <div key={i} className="relative flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-border-subtle flex items-center justify-center shrink-0 z-10 transition-transform hover:scale-110">
                    <div className={`w-2.5 h-2.5 rounded-full ${SEVERITY_DOT[item.severity] ?? "bg-zinc-300"} shadow-sm`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">
                      <span className="text-muted-foreground mr-1">[{TYPE_LABEL[item.type] ?? item.type}]</span> {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    <p className="text-2xs text-muted-foreground mt-1 font-bold uppercase tracking-tight">{relativeTime(item.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TrafficChart({ buckets, bucket }: { buckets: TrafficBucketResp[], bucket: string }) {
  const height = 280
  const width = 800
  // 以总量最大值定纵轴（至少 1，避免除零）；错误线共用同一刻度便于直观对比占比。
  const maxValue = Math.max(1, ...buckets.map(b => b.total))
  const n = buckets.length

  const xAt = (i: number) => (n <= 1 ? width / 2 : (i / (n - 1)) * width)
  const yAt = (v: number) => height - (v / maxValue) * height * 0.8

  // 平滑曲线路径：给定每个桶取某个数值字段。
  const linePath = (pick: (b: TrafficBucketResp) => number) => {
    const pts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(pick(b)) }))
    if (pts.length === 0) return ""
    return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p, i) => {
      const prev = pts[i]
      const cx = prev.x + (p.x - prev.x) / 2
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
    }).join(" ")
  }

  const totalPath = linePath(b => b.total)
  const errorPath = linePath(b => b.errors)
  const areaD = `${totalPath} V ${height} H 0 Z`

  // X 轴标签：按桶数量稀疏显示，避免拥挤。
  const labelStep = n <= 8 ? 1 : Math.ceil(n / 7)
  const fmtLabel = (ts: string) => {
    const d = new Date(ts)
    return bucket === "day" ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getHours()}:00`
  }

  return (
    <div className="w-full h-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="0" y1={(i / 3) * height * 0.8} x2={width} y2={(i / 3) * height * 0.8} stroke="hsl(var(--border))" strokeWidth="1" />
        ))}
        <g key={bucket}>
          <path d={areaD} fill="url(#chartGradient)" />
          <path d={errorPath} fill="none" stroke="rgb(248 113 113)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
          <path d={totalPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
          {buckets.map((b, i) => {
            if (i % labelStep !== 0 && i !== n - 1) return null
            const x = xAt(i)
            return (
              <g key={i}>
                <circle cx={x} cy={yAt(b.total)} r="4" fill="hsl(var(--primary))" stroke="white" strokeWidth="2" />
                <text x={x} y={height + 20} textAnchor="middle" className="text-2xs fill-zinc-400 font-bold uppercase tracking-tight">{fmtLabel(b.ts)}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function StatCard({ title, value, change, trend, icon: Icon, color }: {
  title: string; value: string | number; change: string; trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>; color: string
}) {
  const colorMap: Record<string, string> = {
    blue: "text-primary bg-primary/10",
    indigo: "text-indigo-600 bg-indigo-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
  }
  return (
    <div className="bg-white rounded-lg border border-border-subtle p-5 shadow-sm hover:shadow-sm transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <h3 className="text-2xl font-bold text-foreground mt-1 tracking-tight">{value}</h3>
      </div>
    </div>
  )
}
