"use client"

import { Server, Globe, Trash2, Eye, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Gateway } from "@/lib/api-client"

interface GatewayCardProps {
  gateway: Gateway
  formatTime: (ts: string) => string
  onViewDeploy: (gw: Gateway) => void
  onDelete: (gw: Gateway) => void
}

export function GatewayCard({ gateway: gw, formatTime, onViewDeploy, onDelete }: GatewayCardProps) {
  return (
    <div className="bg-white border border-zinc-100 rounded-lg p-5 flex flex-col shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center border transition-colors",
            gw.status === "online" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-zinc-50 text-zinc-400 border-zinc-100"
          )}>
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight">{gw.name}</h3>
              {gw.is_platform && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 border border-purple-100 rounded text-[10px] font-bold text-purple-600">
                  <Lock className="w-2.5 h-2.5" /> 内置
                </span>
              )}
            </div>
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

      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
        <div className="text-xs font-medium text-zinc-400">
          最后心跳: {formatTime(gw.last_seen)}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold text-zinc-500 hover:text-blue-600" onClick={() => onViewDeploy(gw)}>
            <Eye className="w-3.5 h-3.5 mr-1" /> 部署信息
          </Button>
          {!gw.is_platform && (
            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => onDelete(gw)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
