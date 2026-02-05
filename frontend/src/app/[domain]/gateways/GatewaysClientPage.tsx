"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Server,
  Plus,
  Search,
  Activity,
  ShieldCheck,
  Cpu,
  Globe,
  Settings,
  Signal,
  SignalLow,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProjectStore } from "@/store/useProjectStore"
import { useUIStore } from "@/store/useUIStore"
import { cn } from "@/lib/utils"

export default function GatewaysClientPage() {
  const { activeTenant } = useUIStore()
  const { gateways } = useProjectStore()
  const [search, setSearch] = useState("")

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">执行节点管理 (Runners)</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">执行节点部署于数据库所在机器，提供安全的内网数据索引能力。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-4 rounded-md border-zinc-200 text-xs font-bold shadow-sm">
            刷新心跳
          </Button>
          <Link href={`/${activeTenant}/gateways/register`}>
            <Button className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 group">
              <Plus className="w-4 h-4 mr-2" />
              安装新节点
            </Button>
          </Link>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {gateways.map((gw, idx) => (
          <motion.div 
            key={gw.id} 
            whileHover={{ y: -2 }}
            className="bg-white border border-zinc-200/60 rounded-xl p-5 flex flex-col shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center border transition-colors",
                  gw.status === 'Online' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-zinc-50 text-zinc-400 border-zinc-100"
                )}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight">{gw.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400 font-medium whitespace-nowrap">
                    <Globe className="w-3 h-3" />
                    {gw.address} • {gw.version}
                  </div>
                </div>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center shadow-sm",
                gw.status === 'Online' 
                  ? "text-emerald-600 border-emerald-100 bg-emerald-50" 
                  : "text-zinc-400 border-zinc-100 bg-zinc-50"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full mr-1.5",
                  gw.status === 'Online' ? "bg-emerald-500" : "bg-zinc-300"
                )} />
                {gw.status === 'Online' ? "Online" : "Offline"}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-medium text-zinc-500">
                <span className="flex items-center gap-2">
                   机器负载 (Load)
                </span>
                <span className={cn("font-bold", gw.load > 50 ? "text-orange-500" : "text-blue-600")}>{gw.load}%</span>
              </div>
              <div className="h-2 bg-zinc-100/50 rounded-full overflow-hidden border border-zinc-100">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000", gw.load > 50 ? "bg-orange-500" : "bg-blue-600")}
                  style={{ width: `${gw.load}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-200/60 border-dashed">
              <div className="flex items-center text-[11px] font-medium text-zinc-400">
                服务状态正常
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-zinc-100 transition-colors">
                  <Settings className="w-4 h-4 text-zinc-400" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-zinc-100 transition-colors">
                  <ExternalLink className="w-4 h-4 text-zinc-400" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function MonitorCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorMap: any = {
    "text-emerald-600": "text-emerald-600 bg-emerald-50",
    "text-blue-600": "text-blue-600 bg-blue-50",
    "text-zinc-600": "text-zinc-600 bg-zinc-50",
    "text-rose-600": "text-rose-600 bg-rose-50",
  }

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white border border-zinc-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color] || "bg-zinc-50")}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
        <h3 className="text-2xl font-bold text-zinc-900 mt-1 tracking-tight">{value}</h3>
      </div>
    </motion.div>
  )
}
