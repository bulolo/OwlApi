"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Database,
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Filter,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useProjectStore } from "@/store/useProjectStore"
import { cn } from "@/lib/utils"

const DB_TYPE_COLORS = {
  MySQL: "text-blue-600 border-blue-100 bg-blue-50/30",
  PostgreSQL: "text-indigo-600 border-indigo-100 bg-indigo-50/30",
  MongoDB: "text-green-600 border-green-100 bg-green-50/30",
  Redis: "text-red-600 border-red-100 bg-red-50/30",
  Oracle: "text-orange-600 border-orange-100 bg-orange-50/30",
}

export default function DataSourcesClientPage() {
  const { dataSources } = useProjectStore()
  const [search, setSearch] = useState("")

  const filteredSources = dataSources.filter(ds =>
    ds.name.toLowerCase().includes(search.toLowerCase()) ||
    ds.type.toLowerCase().includes(search.toLowerCase()) ||
    ds.host.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">数据源管理</h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium italic">通过自建网关实现跨网络数据库安全接入</p>
        </div>
        <Button className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all group">
          <Plus className="w-4 h-4 mr-2" />
          接入新数据源
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MiniStat label="连接正常" value={dataSources.filter(ds => ds.status === 'Connected').length} color="text-emerald-600" />
        <MiniStat label="链路异常" value={dataSources.filter(ds => ds.status === 'Error').length} color="text-rose-600" />
        <MiniStat label="已登记总数" value={dataSources.length} color="text-blue-600" />
        <MiniStat label="可用网关" value="3" color="text-zinc-600" />
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg p-3 flex flex-col md:flex-row gap-2 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            placeholder="检索数据源..."
            className="pl-8 h-8 text-xs bg-zinc-50 border-zinc-100 rounded focus:ring-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="ghost" className="h-8 text-xs font-bold px-3 border border-zinc-100 hover:bg-zinc-50 text-zinc-600">
          <Filter className="w-3.5 h-3.5 mr-2" />
          筛选类型
        </Button>
      </div>

      <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 bg-zinc-50/50 border-b px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          <div className="col-span-4">数据源名称 / 类型</div>
          <div className="col-span-3 text-center">网络主机 (Host)</div>
          <div className="col-span-3 text-center">最后心跳</div>
          <div className="col-span-2 text-right">状态</div>
        </div>
        <div className="divide-y divide-zinc-100">
          {filteredSources.map((ds) => (
            <div key={ds.id} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-zinc-50/50 transition-colors">
              <div className="col-span-4 flex items-center space-x-3">
                <div className={cn("p-1.5 rounded border", DB_TYPE_COLORS[ds.type as keyof typeof DB_TYPE_COLORS])}>
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">{ds.name}</p>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter mt-0.5">{ds.type}</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <p className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded inline-block">{ds.host}:{ds.port}</p>
              </div>
              <div className="col-span-3 text-center text-[10px] text-zinc-400 font-medium flex items-center justify-center">
                <Clock className="w-3 h-3 mr-1.5 opacity-40" />
                {ds.updatedAt}
              </div>
              <div className="col-span-2 text-right">
                <div className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border",
                  ds.status === 'Connected' ? "text-emerald-600 border-emerald-100 bg-emerald-50/50" :
                    "text-rose-600 border-rose-100 bg-rose-50/50"
                )}>
                  {ds.status === 'Connected' ? "正常" : "异常"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm border-zinc-200">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{label}</p>
      <p className={cn("text-lg font-black mt-0.5", color)}>{value}</p>
    </div>
  )
}
