"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useGroupsQuery } from "../_hooks/useGroupsQuery"
import { useTenantProject } from "../_hooks/useTenantProject"
import type { HttpMethod } from "../_types"

export interface BasicInfoValues {
  method: HttpMethod
  path: string
  summary: string
  groupId: number
}

interface BasicInfoModalProps {
  open: boolean
  onClose: () => void
  mode: "create" | "edit"
  initialValues?: Partial<BasicInfoValues>
  loading?: boolean
  onConfirm: (values: BasicInfoValues) => void | Promise<void>
}

export function BasicInfoModal({ open, onClose, mode, initialValues, loading, onConfirm }: BasicInfoModalProps) {
  const { activeTenant, projectId } = useTenantProject()
  const { list: groups = [] } = useGroupsQuery(activeTenant, projectId)

  const [method, setMethod] = useState<HttpMethod>(initialValues?.method ?? "POST")
  const [path, setPath] = useState(initialValues?.path ?? "")
  const [summary, setSummary] = useState(initialValues?.summary ?? "")
  const [groupId, setGroupId] = useState(initialValues?.groupId ?? 0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setMethod(initialValues?.method ?? "POST")
      setPath(initialValues?.path ?? "")
      setSummary(initialValues?.summary ?? "")
      setGroupId(initialValues?.groupId ?? 0)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleConfirm() {
    if (!path.trim()) {
      toast.error("路径不能为空")
      return
    }
    setSubmitting(true)
    try {
      await onConfirm({ method, path: path.trim(), summary: summary.trim(), groupId })
    } finally {
      setSubmitting(false)
    }
  }

  const isLoading = loading || submitting

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-150" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200/80 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-800">
            {mode === "create" ? "新建接口" : "编辑基本信息"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Method + Group row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">请求方式</label>
              <Select value={method} onValueChange={v => setMethod(v as HttpMethod)}>
                <SelectTrigger className={cn(
                  "h-9 w-full rounded-lg border text-xs font-bold uppercase tracking-wider shadow-none",
                  method === "GET"    ? "bg-blue-50 text-blue-600 border-blue-200"
                  : method === "POST"   ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : method === "PUT"    ? "bg-amber-50 text-amber-600 border-amber-200"
                  : method === "DELETE" ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-zinc-50 text-zinc-500 border-zinc-200"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">分组</label>
              <Select value={String(groupId)} onValueChange={v => setGroupId(Number(v))}>
                <SelectTrigger className="h-9 w-full rounded-lg border border-zinc-200 text-xs shadow-none bg-white">
                  <SelectValue placeholder="未分组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">未分组</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Path */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">路径 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={path}
              onChange={e => setPath(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleConfirm() }}
              placeholder="/users 或 /orders/:id"
              className="h-9 w-full px-3 rounded-lg border border-zinc-200 bg-white text-sm font-mono text-zinc-700 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              autoFocus
            />
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">接口名称</label>
            <input
              type="text"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleConfirm() }}
              placeholder="简短描述这个接口的用途（可选）"
              className="h-9 w-full px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-100 bg-zinc-50/60">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading} className="h-8 text-xs text-zinc-500">
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading}
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-5"
          >
            {isLoading && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
            {mode === "create" ? "创建" : "保存"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
