"use client"

import { format } from "date-fns"
import { History, RotateCcw, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEndpointFormStore } from "../../_store/useEndpointFormStore"
import { useApiEditorStore } from "../../_store/useApiEditorStore"
import { useTenantProject } from "../../_hooks/useTenantProject"

function formatDate(d: string) {
  try { return format(new Date(d), "yyyy-MM-dd HH:mm") } catch { return d }
}

/**
 * 当编辑器内容来自某个历史版本的复制时，在「设计」Tab 顶部显示提示条。
 *
 * 整个应用唯一一个"手动保存"入口就放在这里——
 * 其他改动（基本信息弹窗、SQL 设计器）都在弹窗自己内部 save，只有"复制历史版本到编辑器"
 * 这一条路径会留下脏草稿需要用户主动确认入库。
 *
 * 持续显示直到：用户点「撤销」 / 用户点「保存为草稿」 / 切换到其他接口 / 页面刷新。
 */
export function RestoredBanner() {
  const { activeTenant, projectId } = useTenantProject()
  const restored = useEndpointFormStore(s => s.restoredFromVersion)
  const undoRestore = useEndpointFormStore(s => s.undoRestore)
  const isDirty = useEndpointFormStore(s => s.isDirty)
  const saving = useEndpointFormStore(s => s.saving)
  const save = useEndpointFormStore(s => s.save)
  const selectedId = useApiEditorStore(s => s.selectedId)

  if (!restored) return null

  async function handleSave() {
    if (!selectedId) return
    await save(activeTenant, projectId, false, selectedId)
  }

  return (
    <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-3.5 flex items-center gap-3 text-amber-700 animate-in slide-in-from-top-2">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
        <History className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">
          正在基于 <span className="font-black">v{restored.version}</span> 编辑
        </p>
        <p className="text-xs opacity-70">
          来源版本创建于 {formatDate(restored.createdAt)}；保存只更新草稿，需点「发布上线」生成新版本
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={undoRestore}
        disabled={saving}
        className="hover:bg-amber-100 text-amber-700 rounded-lg h-7 text-xs gap-1.5"
      >
        <RotateCcw className="w-3 h-3" />
        撤销
      </Button>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        保存为草稿
      </Button>
    </div>
  )
}
