"use client"

import { cn } from "@/lib/utils"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"

export function EndpointHeader() {
  const method = useEndpointFormStore(s => s.form.method)
  const path   = useEndpointFormStore(s => s.form.path)

  return (
    <div className="h-14 border-b border-border-subtle flex items-center px-6 bg-white shrink-0 gap-3">
      <span className={cn(
        "shrink-0 text-2xs font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider",
        method === "GET"    ? "bg-primary/10 text-primary border-primary/20"
        : method === "POST"   ? "bg-emerald-50 text-emerald-600 border-emerald-100"
        : method === "PUT"    ? "bg-amber-50 text-amber-600 border-amber-100"
        : method === "DELETE" ? "bg-red-50 text-red-600 border-red-100"
        : "bg-zinc-50 text-muted-foreground border-border"
      )}>
        {method}
      </span>
      <span className={cn(
        "text-lg font-bold tracking-tight truncate",
        path ? "text-foreground" : "text-zinc-300"
      )}>
        {path || "在 SQL 设计器中编辑路径"}
      </span>
    </div>
  )
}
