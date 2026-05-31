"use client"

import { Trash2, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ScriptResp as Script } from "@/lib/sdk"

interface ScriptItemProps {
  script: Script
  active: boolean
  onSelect: () => void
  onDelete: () => void
}

export function ScriptItem({ script, active, onSelect, onDelete }: ScriptItemProps) {
  const refCount = script.ref_count ?? 0
  const referenced = refCount > 0
  return (
    <div
      onClick={onSelect}
      className={cn(
        "px-4 py-3 cursor-pointer transition-colors group flex items-center justify-between border-b border-zinc-50 border-l-2 border-l-transparent",
        active ? "bg-primary/10 border-l-primary" : "hover:bg-zinc-50/50"
      )}
    >
      <div className="min-w-0 flex-1">
        {/* Type (前置/后置) is conveyed by the group header, so no per-row dot. */}
        <span className={cn("block text-xs font-bold truncate tracking-tight", active ? "text-primary" : "text-zinc-700 group-hover:text-primary")}>
          {script.name}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {/* Reference count is always shown; referenced scripts are protected
            from deletion (the backend also rejects the delete with a 409). */}
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-2xs font-bold tabular-nums",
            referenced ? "text-muted-foreground" : "text-muted-foreground/35",
          )}
          title={referenced ? `被 ${refCount} 个接口引用，无法删除` : "未被任何接口引用"}
        >
          <Link2 className="w-3 h-3" />
          {refCount}
        </span>
        {!referenced && (
          <Button variant="ghost" size="icon-xs" className="rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500" onClick={e => { e.stopPropagation(); onDelete() }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
