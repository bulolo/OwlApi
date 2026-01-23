"use client"

import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Zap,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function MetricsClientPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">调用分析</h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">实时监控 API 调用链路、延迟及吞吐量指标</p>
        </div>
        <div className="flex gap-2">
          <select className="h-8 rounded border border-zinc-200 bg-white px-3 text-[10px] font-bold uppercase tracking-tight text-zinc-600 outline-none">
            <option>过去 24 小时</option>
            <option>过去 7 天</option>
            <option>过去 1 个月</option>
          </select>
          <Button variant="outline" className="h-8 px-3 rounded text-[10px] font-bold border-zinc-200">导出报表</Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatItem label="总调用次数" value="1,284,902" change="+12.5%" trend="up" icon={BarChart3} />
        <StatItem label="平均响应延迟" value="42ms" change="-4.2%" trend="down" icon={Zap} />
        <StatItem label="请求成功率" value="99.98%" change="0.0%" trend="neutral" icon={ShieldCheck} />
        <StatItem label="当前并发数" value="842" change="+18.1%" trend="up" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mock Chart Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border rounded-lg p-5 shadow-sm h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">流量分布 (Requests over time)</h3>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-zinc-400">成功</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[10px] font-bold text-zinc-400">错误</span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-end justify-between space-x-2 px-2">
              {[40, 60, 45, 90, 65, 80, 50, 70, 85, 40, 55, 95, 75, 60, 40, 80, 90, 50, 30, 70].map((h, i) => (
                <div key={i} className="flex-1 space-y-1 group">
                  <div
                    className="w-full bg-blue-100 group-hover:bg-blue-500 transition-colors rounded-t-sm relative"
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[8px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {h}k
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 px-1">
              {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'].map(t => (
                <span key={t} className="text-[9px] font-bold text-zinc-300 uppercase">{t}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-4 shadow-sm flex flex-col space-y-4">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">错误类型分布</h4>
              <div className="space-y-3">
                <ProgressItem label="404 Not Found" value={12} color="bg-zinc-200" />
                <ProgressItem label="500 Internal Error" value={4} color="bg-rose-500" />
                <ProgressItem label="401 Unauthorized" value={65} color="bg-amber-400" />
                <ProgressItem label="429 Rate Limit" value={19} color="bg-zinc-400" />
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow-sm flex flex-col space-y-4">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">热门端点</h4>
              <div className="space-y-3">
                <EndpointItem method="GET" path="/v1/users" count="45.2k" />
                <EndpointItem method="POST" path="/v1/orders" count="28.1k" />
                <EndpointItem method="GET" path="/v1/products" count="19.4k" />
                <EndpointItem method="PUT" path="/v1/profile" count="5.2k" />
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Side Log */}
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b bg-zinc-50/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">实时监控日志 (Live)</span>
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4 font-mono text-[10px]">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex flex-col space-y-1 py-2 border-b border-zinc-50 last:border-0">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">17:40:1{i}.482</span>
                  <span className="text-emerald-600 font-bold">200 OK</span>
                </div>
                <div className="text-zinc-700">
                  <span className="text-blue-600 font-bold mr-2 uppercase">GET</span>
                  /api/v1/products?limit=20
                </div>
                <div className="flex items-center text-zinc-400">
                  <Clock className="w-2.5 h-2.5 mr-1" />
                  Trace: {Math.random().toString(36).substr(2, 9)} • 24ms
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value, change, trend, icon: Icon }: { label: string; value: string; change: string; trend: 'up' | 'down' | 'neutral'; icon: any }) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="w-7 h-7 bg-zinc-50 border border-zinc-100 rounded flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className={cn(
          "flex items-center text-[10px] font-bold",
          trend === 'up' ? "text-emerald-600" : trend === 'down' ? "text-rose-600" : "text-zinc-400"
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : null}
          {change}
        </div>
      </div>
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{label}</p>
      <p className="text-lg font-black text-zinc-900 mt-1">{value}</p>
    </div>
  )
}

function ProgressItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5 text-[10px] font-bold">
      <div className="flex justify-between text-zinc-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1 bg-zinc-50 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function EndpointItem({ method, path, count }: { method: string; path: string; count: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] font-medium border-b border-zinc-50 pb-2 last:border-0 last:pb-0">
      <div className="flex items-center space-x-2 min-w-0">
        <span className={cn(
          "text-[9px] font-bold px-1 rounded",
          method === 'GET' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
        )}>{method}</span>
        <span className="truncate text-zinc-700">{path}</span>
      </div>
      <span className="text-zinc-400 font-bold ml-2">{count}</span>
    </div>
  )
}
