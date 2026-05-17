"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Rocket, FilePlus2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type VersionDialogMode = "publish" | "create"

interface VersionNoteDialogProps {
  open: boolean
  mode: VersionDialogMode
  /** 当前最新版本号，用于在标题展示"将创建 vN" */
  nextVersion?: number
  loading?: boolean
  onClose: () => void
  onConfirm: (note: string) => void | Promise<void>
}

// 外壳：根据 open 决定是否挂载内层。内层每次重开都是全新组件，note 状态天然回 ""，
// 不需要 useEffect 重置 state（避免 react-hooks/set-state-in-effect 警告）。
export function VersionNoteDialog(props: VersionNoteDialogProps) {
  if (!props.open) return null
  return <VersionNoteDialogInner {...props} />
}

function VersionNoteDialogInner({ mode, nextVersion, loading, onClose, onConfirm }: VersionNoteDialogProps) {
  const [note, setNote] = useState("")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, loading])

  const isPublish = mode === "publish"
  const title = isPublish ? "发布上线" : "创建版本（不上线）"
  const subtitle = isPublish
    ? "会基于当前草稿创建一个新版本，并立刻替换线上接口。"
    : "把当前草稿冻结为一个不可变版本，但不会改变线上接口。可在「版本历史」中随时手动上线。"
  const versionLabel = nextVersion && nextVersion > 0 ? `将创建 v${nextVersion}` : null
  const Icon = isPublish ? Rocket : FilePlus2
  const confirmText = loading
    ? (isPublish ? "发布中…" : "创建中…")
    : (isPublish ? "发布上线" : "创建版本")

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
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isPublish ? "bg-emerald-50 text-emerald-600" : "bg-primary/10 text-primary",
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              {versionLabel && (
                <span className="text-2xs font-black px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-border">
                  {versionLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-2">
          <label className="text-xs font-bold text-zinc-700 flex items-center gap-2">
            发布说明
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

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50/60 border-t border-border-subtle flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading} className="h-8 text-xs px-4">
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "h-8 text-xs px-4 gap-1.5",
              isPublish ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "",
            )}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
