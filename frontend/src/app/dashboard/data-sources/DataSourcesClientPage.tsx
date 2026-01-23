"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
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
import { Badge } from "@/components/ui/badge"
import { useProjectStore } from "@/store/useProjectStore"
import { cn } from "@/lib/utils"

const DB_TYPE_COLORS = {
  MySQL: "text-blue-600 border-blue-100 bg-blue-50/30",
  PostgreSQL: "text-indigo-600 border-indigo-100 bg-indigo-50/30",
  StarRocks: "text-amber-600 border-amber-100 bg-amber-50/30",
  MongoDB: "text-green-600 border-green-100 bg-green-50/30",
  Oracle: "text-orange-600 border-orange-100 bg-orange-50/30",
}

export default function DataSourcesClientPage() {
  const { dataSources, gateways } = useProjectStore()
  const [search, setSearch] = useState("")

  const filteredSources = dataSources.filter(ds =>
    ds.name.toLowerCase().includes(search.toLowerCase()) ||
    ds.type.toLowerCase().includes(search.toLowerCase()) ||
    ds.dev.host.toLowerCase().includes(search.toLowerCase()) ||
    (ds.isDual && ds.prod?.host?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">数据源管理</h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium italic">通过自建执行节点实现跨网络数据库安全接入</p>
        </div>
        <Link href="/dashboard/data-sources/new">
          <Button className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all group">
            <Plus className="w-4 h-4 mr-2" />
            接入新数据源
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MiniStat label="连接正常 (DEV)" value={dataSources.filter(ds => ds.dev.status === 'Connected').length} color="text-emerald-600" />
        <MiniStat label="连接正常 (PROD)" value={dataSources.filter(ds => ds.isDual && ds.prod?.status === 'Connected').length} color="text-blue-600" />
        <MiniStat label="已登记总数" value={dataSources.length} color="text-zinc-600" />
        <MiniStat label="可用执行节点" value={gateways.filter(g => g.status === 'Online').length} color="text-zinc-600" />
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
          <div className="col-span-3">数据源名称 / 类型</div>
          <div className="col-span-8 border-x border-zinc-200/50 px-4">连接配置 (环境 / 执行节点 / 地址)</div>
          <div className="col-span-1 text-right">操作</div>
        </div>
        <div className="divide-y divide-zinc-100">
          {filteredSources.map((ds) => {
            const devRunner = gateways.find(g => g.id === ds.dev.gatewayId)
            const prodRunner = ds.prod ? gateways.find(g => g.id === ds.prod.gatewayId) : null
            
            return (
              <div key={ds.id} className="grid grid-cols-12 px-4 py-4 items-center hover:bg-zinc-50/50 transition-colors">
                <div className="col-span-3 flex items-center space-x-3">
                  <div className={cn("p-2 rounded border shadow-sm", DB_TYPE_COLORS[ds.type as keyof typeof DB_TYPE_COLORS])}>
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{ds.name}</p>
                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter mt-0.5">{ds.type} • {ds.updatedAt}</p>
                  </div>
                </div>

                {/* CONSOLIDATED ENVS */}
                <div className="col-span-8 px-4 border-x border-zinc-100 flex flex-col gap-3 py-1">
                  {/* DEV/DEFAULT CONFIG */}
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 px-1.5 py-0.5 text-[9px] font-black rounded border uppercase tracking-tighter text-center shrink-0",
                      ds.isDual ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    )}>
                      {ds.isDual ? "DEV" : "BASE"}
                    </div>
                    <div className="flex-1 flex items-center justify-between text-[11px] font-mono text-zinc-600 bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                      <span className="truncate">{ds.dev.host}:{ds.dev.port}</span>
                      <Badge variant="outline" className={cn(
                        "scale-[0.8] origin-right px-1.5 h-4 border-none font-black uppercase tracking-tighter",
                        ds.dev.status === 'Connected' ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                      )}>
                        {ds.dev.status === 'Connected' ? "LIVE" : "FAIL"}
                      </Badge>
                    </div>
                    <div className="flex items-center text-[10px] font-bold text-zinc-500 bg-white border border-zinc-100 px-2 py-0.5 rounded shadow-sm shrink-0 min-w-[120px]">
                      <Server className="w-3 h-3 mr-1.5 text-blue-500" />
                      {devRunner?.name || '未知节点'}
                    </div>
                  </div>

                  {/* PROD CONFIG */}
                  {ds.isDual && ds.prod && (
                    <div className="flex items-center gap-4 pt-2 border-t border-zinc-50 border-dashed">
                      <div className="w-10 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black rounded border border-blue-100 uppercase tracking-tighter text-center shrink-0">PROD</div>
                      <div className="flex-1 flex items-center justify-between text-[11px] font-mono text-zinc-600 bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                        <span className="truncate">{ds.prod.host}:{ds.prod.port}</span>
                        <Badge variant="outline" className={cn(
                          "scale-[0.8] origin-right px-1.5 h-4 border-none font-black uppercase tracking-tighter",
                          ds.prod.status === 'Connected' ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                        )}>
                          {ds.prod.status === 'Connected' ? "LIVE" : "FAIL"}
                        </Badge>
                      </div>
                      <div className="flex items-center text-[10px] font-bold text-zinc-500 bg-white border border-zinc-100 px-2 py-0.5 rounded shadow-sm shrink-0 min-w-[120px]">
                        <Server className="w-3 h-3 mr-1.5 text-blue-500" />
                        {prodRunner?.name || '未知节点'}
                      </div>
                    </div>
                  )}

                  {!ds.isDual && (
                    <div className="flex items-center gap-2 pt-1">
                       <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest italic ml-14">基础连接模式 - 统一节点访问</span>
                    </div>
                  )}
                </div>

                <div className="col-span-1 text-right">
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded hover:bg-zinc-100">
                    <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                  </Button>
                </div>
              </div>
            )
          })}
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
