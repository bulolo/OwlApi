"use client"

import { Lock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Script } from "@/lib/api-client"

interface ScriptItemProps {
  script: Script
  active: boolean
  onSelect: () => void
  onDelete: () => void
}

export function ScriptItem({ script, active, onSelect, onDelete }: ScriptItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "px-4 py-3 cursor-pointer transition-all group flex items-center justify-between border-b border-zinc-50",
        active ? "bg-blue-50/50 border-r-2 border-r-blue-600" : "hover:bg-zinc-50/50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs font-bold truncate tracking-tight", active ? "text-blue-700" : "text-zinc-700 group-hover:text-blue-600")}>
            {script.name}
          </span>
          {script.is_platform && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
              <Lock className="w-2 h-2" /> 内置
            </span>
          )}
        </div>
        {script.description && (
          <p className="text-[10px] text-zinc-400 truncate mt-0.5">{script.description}</p>
        )}
      </div>
      {!script.is_platform && (
        <Button variant="ghost" size="icon" className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 shrink-0 ml-2" onClick={e => { e.stopPropagation(); onDelete() }}>
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
