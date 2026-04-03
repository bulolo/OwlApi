"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Database,
  Plus,
  Search,
  MoreHorizontal,
  Server,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useProjectStore } from "@/store/useProjectStore"
import { useUIStore } from "@/store/useUIStore"
import { cn } from "@/lib/utils"

const DB_TYPE_COLORS: Record<string, string> = {
  MySQL: "text-blue-600 border-blue-100 bg-blue-50/30",
  PostgreSQL: "text-indigo-600 border-indigo-100 bg-indigo-50/30",
  StarRocks: "text-amber-600 border-amber-100 bg-amber-50/30",
  MongoDB: "text-green-600 border-green-100 bg-green-50/30",
  Oracle: "text-orange-600 border-orange-100 bg-orange-50/30",
}

export default function DataSourcesClientPage() {
  const { activeTenant } = useUIStore()
  const { dataSources, gateways } = useProjectStore()
  const [search, setSearch] = useState("")

  const filteredSources = dataSources.filter(ds =>
    ds.name.toLowerCase().includes(search.toLowerCase()) ||
    ds.type.toLowerCase().includes(search.toLowerCase()) ||
    ds.dev.host.toLowerCase().includes(search.toLowerCase()) ||
    (ds.isDual && ds.prod?.host?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">数据源管理</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">通过自建网关节点实现跨网络数据库安全接入</p>
        </div>
        <Link href={`/${activeTenant}/data-sources/new`}>
          <Button className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" />
            接入新数据源
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-zinc-200/60 rounded-xl p-3 flex flex-col md:flex-row gap-2 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="通过名称、地址或类型快速检索数据源资产..."
            className="pl-9 h-9 text-xs bg-zinc-50 border-zinc-100 rounded-lg focus:ring-1 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="ghost" className="h-9 text-[10px] font-bold uppercase tracking-wide px-4 border border-zinc-100 hover:bg-zinc-50 text-zinc-500 rounded-lg">
          <Filter className="w-3.5 h-3.5 mr-2" />
          Filter Type
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSources.map((ds) => {
          const devRunner = gateways.find(g => g.id === ds.dev.gatewayId)
          
          return (
            <motion.div
              key={ds.id}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Card className="bg-white border-zinc-200/60 rounded-xl shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-colors", DB_TYPE_COLORS[ds.type] || "text-zinc-600 border-zinc-100 bg-zinc-50/30")}>
                      <Database className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1.5">
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tight",
                        ds.dev.status === 'Connected' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        DEV: {ds.dev.status === 'Connected' ? "LIVE" : "FAIL"}
                      </div>
                      {ds.isDual && (
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tight",
                          ds.prod?.status === 'Connected' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          PROD: {ds.prod?.status === 'Connected' ? "LIVE" : "FAIL"}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight">
                    {ds.name}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide mt-1 flex items-center gap-2">
                    {ds.type} 
                    <span className="w-1 h-1 rounded-full bg-zinc-200" />
                    Updated {ds.updatedAt}
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="flex flex-col gap-1.5">
                       <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Environment Endpoints</span>
                       <div className="flex items-center justify-between text-[11px] font-mono text-zinc-600 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-100">
                          <span className="truncate">{ds.dev.host}</span>
                          <span className="text-zinc-300 ml-2">:{ds.dev.port}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto px-6 py-4 border-t border-zinc-100 bg-zinc-50/10 flex items-center justify-between">
                  <div className="flex items-center text-[10px] font-bold text-zinc-500">
                    <Server className="w-3.5 h-3.5 mr-2 text-blue-500" />
                    {devRunner?.name || '未知节点'}
                  </div>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-zinc-100">
                    <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}

        <Link href={`/${activeTenant}/data-sources/new`} className="group">
          <div className="border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center p-6 bg-zinc-50/20 hover:bg-white hover:border-blue-400/50 hover:shadow-xl transition-all cursor-pointer h-full min-h-[220px]">
            <div className="w-12 h-12 rounded-lg border border-zinc-100 flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
              <Plus className="w-6 h-6 text-zinc-300 group-hover:text-white" />
            </div>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide">接入新数据源</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
