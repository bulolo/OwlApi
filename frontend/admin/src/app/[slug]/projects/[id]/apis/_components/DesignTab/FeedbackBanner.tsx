"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useEndpointFormStore } from "../../_store/useEndpointFormStore"

export function FeedbackBanner() {
  const designExecResult = useEndpointFormStore(s => s.designExecResult)
  const setDesignExecResult = useEndpointFormStore(s => s.setDesignExecResult)

  if (!designExecResult || !("error" in designExecResult)) return null

  return (
    <div className="bg-red-50 border border-red-200/60 rounded-xl p-3.5 flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
        <Trash2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">执行失败</p>
        <p className="text-xs opacity-70 truncate">{(designExecResult as { error: string }).error}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setDesignExecResult(null)} className="hover:bg-red-100 text-red-500 rounded-lg h-7 text-xs">
        关闭
      </Button>
    </div>
  )
}
