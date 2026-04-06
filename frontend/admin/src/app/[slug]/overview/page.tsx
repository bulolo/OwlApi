"use client"

import { useState } from "react"
import { Activity, Server, Users, Zap, ArrowUpRight, ArrowDownRight, Box, FolderGit2 } from "lucide-react"
import { useUIStore } from "@/store/useUIStore"
import { useGateways, useProjects, useDataSources } from "@/hooks"

const TRAFFIC_DATA = {
  "24H": [30, 45, 32, 50, 65, 54, 80, 75, 90, 85, 120, 110, 140, 130, 125, 100, 95, 110, 125, 115, 100, 80, 60, 40],
  "7D": [420, 580, 490, 710, 850, 620, 940],
  "30D": [1200, 1500, 1340, 1800, 2100, 1950, 2400, 2200, 2800, 2650]
}

const RANGE_LABELS = {
  "24H": "过去 24 小时的 API 请求动态",
  "7D": "过去 7 天的流量趋势 (日均)",
  "30D": "过去 30 天的总请求趋势"
}

export default function OverviewPage() {
  const [range, setRange] = useState<keyof typeof TRAFFIC_DATA>("24H")
  const { activeTenant } = useUIStore()
  const { gateways, pagination: gwPagination } = useGateways(activeTenant, { is_pager: 0 })
  const { pagination: projPagination } = useProjects(activeTenant, { is_pager: 0 })
  const { pagination: dsPagination } = useDataSources(activeTenant, { is_pager: 0 })

  const onlineGw = gateways.filter(g => g.status === 'online').length
  const gwTotal = gwPagination?.total ?? gateways.length
  const gatewayLabel = `${onlineGw}/${gwTotal}`
  const gatewayStatus = onlineGw === gwTotal && gwTotal > 0 ? 'Healthy' : `${onlineGw} Online`
  const projectCount = projPagination?.total ?? 0
  const dsCount = dsPagination?.total ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">概览</h1>
        <p className="text-sm text-zinc-500 mt-1 font-medium">查看当前租户的 API 资产运行状态、流量统计及最新动态。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="网关节点" value={gatewayLabel} change={gatewayStatus} trend="up" icon={Server} color="blue" />
        <StatCard title="数据源" value={String(dsCount)} change="已接入" trend="up" icon={Activity} color="indigo" />
        <StatCard title="项目" value={String(projectCount)} change={`${dsCount} 数据源`} trend="up" icon={FolderGit2} color="amber" />
        <StatCard title="数据源" value={String(dsCount)} change="已接入" trend="up" icon={Box} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-zinc-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-base font-bold text-zinc-900">流量趋势</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-0.5">{RANGE_LABELS[range]}</p>
            </div>
            <div className="flex gap-1 bg-zinc-50 p-1 rounded-lg border border-zinc-100">
              {(["24H", "7D", "30D"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-[10px] px-3 py-1 rounded-lg font-black tracking-tighter uppercase transition-all ${
                    range === r
                      ? "bg-white shadow-sm border border-zinc-200 text-zinc-900"
                      : "text-zinc-400 hover:bg-white/50 border border-transparent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[280px] w-full relative">
            <TrafficChart data={TRAFFIC_DATA[range]} rangeType={range} />
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-50 border-dashed">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-[11px] font-bold text-zinc-600">正常请求</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <span className="text-[11px] font-bold text-zinc-400">平均负载</span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-400 font-medium">
              峰值数据: <span className="text-zinc-900 font-black">
                {range === "24H"
                  ? `${Math.max(...TRAFFIC_DATA[range])} req/min`
                  : `${(Math.max(...TRAFFIC_DATA[range]) / 1000).toFixed(1)}k req/day`}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-zinc-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-zinc-900 mb-4">最近动态</h3>
          <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:h-full before:w-[2px] before:bg-zinc-100">
            {[
              { type: "API", title: "User_Profile_Query", desc: "SQL 接口发布至生产环境", time: "3 分钟前", color: "bg-blue-500" },
              { type: "GATEWAY", title: "HK-Edge-01", desc: "远程网关节点已上线", time: "12 分钟前", color: "bg-emerald-500" },
              { type: "SQL", title: "Slow Query Alert", desc: "检测到 5 笔慢查询请求 (Sales_Data)", time: "42 分钟前", color: "bg-amber-500" },
              { type: "AUTH", title: "Security Warning", desc: "产生 5 次未授权的 API 访问尝试", time: "5 小时前", color: "bg-red-500" },
            ].map((item, i) => (
              <div key={i} className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-100 flex items-center justify-center shrink-0 z-10 transition-transform hover:scale-110">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm`} />
                </div>
                <div>
                  <p className="text-sm text-zinc-800 font-medium">
                    <span className="text-zinc-400 mr-1">[{item.type}]</span> {item.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                  <p className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-tighter">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TrafficChart({ data, rangeType }: { data: number[], rangeType: string }) {
  const maxValue = Math.max(...data)
  const height = 280
  const width = 800

  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (val / maxValue) * height * 0.8
  }))

  const pathD = `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map((p, i) => {
      const prev = points[i]
      const cx1 = prev.x + (p.x - prev.x) / 2
      const cx2 = prev.x + (p.x - prev.x) / 2
      return `C ${cx1} ${prev.y}, ${cx2} ${p.y}, ${p.x} ${p.y}`
    }).join(" ")

  const areaD = `${pathD} V ${height} H 0 Z`

  return (
    <div className="w-full h-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="0" y1={(i / 3) * height * 0.8} x2={width} y2={(i / 3) * height * 0.8} stroke="#f4f4f5" strokeWidth="1" />
        ))}
        <g key={rangeType}>
          <path d={areaD} fill="url(#chartGradient)" />
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          {points.map((p, i) => {
            const show = (rangeType === "24H" && i % 4 === 0) || rangeType === "7D" || (rangeType === "30D" && i % 2 === 0)
            if (!show) return null
            const label = rangeType === "24H" ? `${i}:00` : rangeType === "7D" ? `Day ${i + 1}` : `Day ${i * 3 + 1}`
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                <text x={p.x} y={height + 20} textAnchor="middle" className="text-[10px] fill-zinc-400 font-bold uppercase tracking-tighter">{label}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function StatCard({ title, value, change, trend, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-50",
    indigo: "text-indigo-600 bg-indigo-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
  }
  return (
    <div className="bg-white rounded-lg border border-zinc-100 p-5 shadow-sm hover:shadow-sm transition-all">
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
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{title}</p>
        <h3 className="text-2xl font-bold text-zinc-900 mt-1 tracking-tight">{value}</h3>
      </div>
    </div>
  )
}
