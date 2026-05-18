"use client"

import { Pencil, ArrowRight } from "lucide-react"
import { useApiEditorStore } from "../../_store/useApiEditorStore"

/**
 * 在设计 tab 顶部点明"草稿不是任何 env 的线上代码"的事实。
 * 各 env 当前真正在跑的版本号已经在编辑器顶栏的并列徽章里展示，这里不重复。
 */
export function DraftStatusBanner() {
  const selectedId = useApiEditorStore(s => s.selectedId)
  const isNew = useApiEditorStore(s => s.isNew)

  if (isNew || !selectedId) return null

  return (
    <div className="border border-amber-200 bg-amber-50/40 rounded-xl px-4 py-3 flex items-start gap-3">
      <Pencil className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-zinc-800">
          这里在编辑「下一个版本」的草稿
        </p>
        <p className="text-2xs text-zinc-600 mt-1 leading-relaxed">
          编辑器里写的 SQL/参数是<strong>项目级共享草稿</strong>。点右上角「创建版本」会冻结成不可变版本（v?），
          但<strong>不会自动上线任何 env</strong>——上线动作请去
          <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded font-bold">
            版本管理 <ArrowRight className="w-2.5 h-2.5" />
          </span>
          tab 里手动选目标 env。
        </p>
      </div>
    </div>
  )
}
