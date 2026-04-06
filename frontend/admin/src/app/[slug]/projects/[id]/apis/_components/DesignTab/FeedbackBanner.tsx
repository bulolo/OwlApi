"use client"

import { Button } from "@/components/ui/button"
import { Trash2, Save } from "lucide-react"
import { useEndpointStore } from "../../_store/useEndpointStore"
import type { ExecutionResult } from "../../_types"

/**
 * FeedbackBanner — 操作反馈横幅（错误/成功提示）
 *
 * 显示在 DesignTab 顶部，用于展示 CRUD 操作的即时反馈
 */
export function FeedbackBanner() {
  const execResult = useEndpointStore(s => s.execResult)
  const setExecResult = useEndpointStore(s => s.setExecResult)

  if (!execResult) return null

  const isError = "error" in execResult
  const isSuccess = "success" in execResult

  if (!isError && !isSuccess) return null

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200/60 rounded-xl p-3.5 flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">操作失败</p>
          <p className="text-xs opacity-70 truncate">{(execResult as { error: string }).error}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExecResult(null)} className="hover:bg-red-100 text-red-500 rounded-lg h-7 text-xs">
          关闭
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-3.5 flex items-center gap-3 text-emerald-600 animate-in slide-in-from-top-2">
      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
        <Save className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">操作成功</p>
        <p className="text-xs opacity-70">{(execResult as { success: string }).success}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setExecResult(null)} className="hover:bg-emerald-100 text-emerald-500 rounded-lg h-7 text-xs">
        关闭
      </Button>
    </div>
  )
}
