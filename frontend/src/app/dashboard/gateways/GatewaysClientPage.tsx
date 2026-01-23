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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProjectStore } from "@/store/useProjectStore"
import { cn } from "@/lib/utils"

export default function GatewaysClientPage() {
  const { gateways } = useProjectStore()
  const [search, setSearch] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">网关管理</h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium leading-relaxed italic">网关部署于数据库所在机器，提供安全的内网数据索引能力</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-4 rounded-md border-zinc-200 text-xs font-bold shadow-sm">
            刷新心跳
          </Button>
          <Button className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm">
            安装新节点
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MonitorCard label="活动节点" value={gateways.filter(g => g.status === 'Online').length} icon={ShieldCheck} color="text-emerald-600" />
        <MonitorCard label="平均资源占用" value="24%" icon={Activity} color="text-blue-600" />
        <MonitorCard label="跨域覆盖" value="3" icon={Globe} color="text-zinc-600" />
        <MonitorCard label="离线记录" value={gateways.filter(g => g.status === 'Offline').length} icon={SignalLow} color="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {gateways.map((gw, idx) => (
          <div key={gw.id} className="bg-white border rounded-lg p-5 flex flex-col hover:border-blue-300 transition-all shadow-sm group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-10 h-10 rounded flex items-center justify-center border",
                  gw.status === 'Online' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-zinc-50 text-zinc-400 border-zinc-100"
                )}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-800">{gw.name}</h3>
                  <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{gw.address} • {gw.version}</p>
                </div>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border flex items-center",
                gw.status === 'Online' ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-zinc-400 border-zinc-100 bg-zinc-50"
              )}>
                {gw.status === 'Online' ? <Signal className="w-2.5 h-2.5 mr-1" /> : <SignalLow className="w-2.5 h-2.5 mr-1" />}
                {gw.status === 'Online' ? "Online" : "Offline"}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-zinc-400">
                <span>机器负载 (Load)</span>
                <span className={cn(gw.load > 50 ? "text-orange-500" : "text-blue-600")}>{gw.load}%</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000", gw.load > 50 ? "bg-orange-500" : "bg-blue-600")}
                  style={{ width: `${gw.load}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-zinc-50">
              <div className="flex -space-x-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[8px] font-black text-zinc-400">P</div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded hover:bg-zinc-100">
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded hover:bg-zinc-100">
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MonitorCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white border rounded-lg p-3.5 flex items-center space-x-3 shadow-sm border-zinc-200">
      <div className={cn("w-8 h-8 rounded bg-zinc-50 flex items-center justify-center", color)}>
        <Icon className="w-4 h-4 opacity-70" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{label}</p>
        <p className="text-base font-black text-zinc-900 tracking-tight">{value}</p>
      </div>
    </div>
  )
}
