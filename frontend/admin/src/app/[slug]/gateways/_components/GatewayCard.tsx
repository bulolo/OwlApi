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
    <div className="bg-white border border-border-subtle rounded-xl p-5 flex flex-col shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center border transition-colors",
            gw.status === "online" ? "bg-primary/10 text-primary border-primary/20" : "bg-zinc-50 text-muted-foreground border-border-subtle"
          )}>
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{gw.name}</h3>
              {gw.is_platform && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 border border-border rounded text-2xs font-bold text-muted-foreground">
                  <Lock className="w-2.5 h-2.5" /> 内置
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
              <Globe className="w-3 h-3" />
              {gw.ip || "-"} {gw.version && `• ${gw.version}`}
            </div>
          </div>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-2xs font-bold border flex items-center shadow-sm",
          gw.status === "online"
            ? "text-emerald-600 border-emerald-100 bg-emerald-50"
            : "text-muted-foreground border-border-subtle bg-zinc-50"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", gw.status === "online" ? "bg-emerald-500" : "bg-zinc-300")} />
          {gw.status === "online" ? "在线" : "离线"}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <div className="text-xs font-medium text-muted-foreground">
          最后心跳: {formatTime(gw.last_seen)}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-2xs font-bold text-muted-foreground hover:text-primary" onClick={() => onViewDeploy(gw)}>
            <Eye className="w-3.5 h-3.5 mr-1" /> 部署信息
          </Button>
          {!gw.is_platform && (
            <Button variant="ghost" size="icon-xs" className="rounded-lg hover:bg-red-50 hover:text-red-500" onClick={() => onDelete(gw)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
