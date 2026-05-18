"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, FilePlus2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

// 仅保留 "create" 一种模式 —— 编辑器顶部按钮已统一为"创建版本"，上线动作在版本管理 tab 单独做。
// 保留 mode 类型只是为了兼容现有调用方的 prop 传参，不会真用到其他分支。
export type VersionDialogMode = "create"

interface VersionNoteDialogProps {
  open: boolean
  mode: VersionDialogMode
  /** 当前最新版本号，用于在标题展示"将创建 vN" */
  nextVersion?: number
  loading?: boolean
  onClose: () => void
  onConfirm: (note: string) => void | Promise<void>
}

export function VersionNoteDialog(props: VersionNoteDialogProps) {
  if (!props.open) return null
  return <VersionNoteDialogInner {...props} />
}

function VersionNoteDialogInner({ nextVersion, loading, onClose, onConfirm }: VersionNoteDialogProps) {
  const [note, setNote] = useState("")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, loading])

  const versionLabel = nextVersion && nextVersion > 0 ? `将创建 v${nextVersion}` : null

  async function handleConfirm() {
    await onConfirm(note.trim())
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-150"
        onClick={loading ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[480px] max-w-[92vw] bg-white rounded-2xl shadow-modal border border-border/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">创建版本（不上线）</h3>
              {versionLabel && (
                <span className="text-2xs font-black px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-border">
                  {versionLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              把当前草稿冻结为一个不可变版本，但不会改变线上接口。可在「版本管理」中随时手动上线。
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-2">
          <label className="text-xs font-bold text-zinc-700 flex items-center gap-2">
            版本说明
            <span className="text-2xs font-medium text-muted-foreground">（可选，用于变更记录）</span>
          </label>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="例如：修复用户列表分页参数；新增按角色筛选..."
            rows={4}
            className="resize-none text-sm"
            disabled={loading}
          />
        </div>

        <div className="px-6 py-3.5 bg-zinc-50/60 border-t border-border-subtle flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading} className="h-8 text-xs px-4">
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading} className="h-8 text-xs px-4 gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus2 className="w-3.5 h-3.5" />}
            {loading ? "创建中…" : "创建版本"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
