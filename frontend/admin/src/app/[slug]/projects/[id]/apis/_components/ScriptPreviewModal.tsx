"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X, FileCode, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Script } from "@/lib/api-client"

interface ScriptPreviewModalProps {
  open: boolean
  script: Script | null
  /** 当用户点"在 SQL 设计器里编辑"时调用——关闭本弹窗并打开 SQL 设计器。 */
  onEditInDesigner?: () => void
  onClose: () => void
}

/**
 * 脚本只读预览弹窗。
 *   • 进入方式：DesignTab SQL 卡片上点"前置/后置"小 pill
 *   • 内容：脚本名、类型徽章、描述、JS 代码（等宽字体只读）
 *   • 编辑入口：底部按钮跳转到 SQL 设计器（脚本编辑统一在那里完成）
 */
export function ScriptPreviewModal({ open, script, onEditInDesigner, onClose }: ScriptPreviewModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || !script) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-150" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[640px] max-w-[92vw] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-modal border border-border/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle shrink-0">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0">
            <FileCode className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground truncate">{script.name}</h3>
              <span className={cn(
                "text-2xs font-black px-1.5 py-0.5 rounded border uppercase tracking-wider",
                script.type === "pre"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200",
              )}>
                {script.type === "pre" ? "前置" : "后置"}
              </span>
              {script.is_platform && (
                <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-border">
                  平台内置
                </span>
              )}
            </div>
            {script.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{script.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-zinc-950 min-h-0">
          <pre className="p-4 text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre">
            {script.code || "// （脚本无内容）"}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-50/60 border-t border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-2xs text-muted-foreground">脚本编辑统一在 SQL 设计器内进行</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs px-3">
              关闭
            </Button>
            {onEditInDesigner && (
              <Button size="sm" onClick={onEditInDesigner} className="h-8 text-xs px-3 gap-1.5">
                <PenLine className="w-3 h-3" />
                在 SQL 设计器里调整
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
