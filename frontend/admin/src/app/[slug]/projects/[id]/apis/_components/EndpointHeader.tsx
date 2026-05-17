"use client"

import { useState } from "react"
import { Rocket, ChevronDown, FilePlus2, Loader2, WifiOff, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { showConfirm } from "@/store/useConfirmStore"

import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import type { ApiEndpoint } from "@/lib/api-client"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useEndpointsQuery } from "../_hooks/useEndpointsQuery"
import { useTenantProject } from "../_hooks/useTenantProject"
import { usePublishEndpoint, useCreateEndpointVersion, useUnpublishEndpoint, useEndpointVersions, useRevertEndpointToActive } from "@/hooks/useEndpointVersions"

import { StatusBadge } from "./StatusBadge"
import { VersionNoteDialog, type VersionDialogMode } from "./VersionNoteDialog"

/**
 * 接口编辑器顶栏：
 *   左：HTTP method + path
 *   中：StatusBadge (草稿/已上线/v? 待上线/...)
 *   右：[保存] 草稿，[发布上线 ▼] 拆分按钮（下拉里有"仅创建版本"）
 *
 * 设计要点：
 *   • 保存只更新 api_endpoints（草稿）。
 *   • 发布上线 = CreateVersion + Activate（后端 /publish）。
 *   • 仅创建版本 = CreateVersion 不激活，成功后跳到「版本历史」Tab。
 *   • "仅创建版本"和"发布上线"都需要填发布说明，统一通过 VersionNoteDialog。
 *   • 新接口（isNew）尚未持久化，无法发布；先要求保存。
 */
export function EndpointHeader() {
  const { activeTenant, projectId } = useTenantProject()

  const method = useEndpointFormStore(s => s.form.method)
  const path = useEndpointFormStore(s => s.form.path)
  const isDirty = useEndpointFormStore(s => s.isDirty)
  const saving = useEndpointFormStore(s => s.saving)
  const save = useEndpointFormStore(s => s.save)
  const clearRestoredBanner = useEndpointFormStore(s => s.clearRestoredBanner)
  const initForm = useEndpointFormStore(s => s.initForm)

  const isNew = useApiEditorStore(s => s.isNew)
  const selectedId = useApiEditorStore(s => s.selectedId)
  const setActiveTab = useApiEditorStore(s => s.setActiveTab)

  const { list: endpoints } = useEndpointsQuery(activeTenant, projectId)
  const currentEp = !isNew && selectedId
    ? endpoints.find(e => e.id === selectedId)
    : null

  const publish = usePublishEndpoint(activeTenant, Number(projectId), selectedId ?? 0)
  const createVersion = useCreateEndpointVersion(activeTenant, Number(projectId), selectedId ?? 0)
  const unpublish = useUnpublishEndpoint(activeTenant, Number(projectId), selectedId ?? 0)

  // 仅在 has_draft && is_published 时按需拉版本列表，用于显示"还原到线上 vN"的版本号
  const showRevertEntry = !!currentEp?.is_published && !!currentEp?.has_draft
  const { versions } = useEndpointVersions(activeTenant, Number(projectId), showRevertEntry ? (selectedId ?? 0) : 0)
  const activeVersion = versions.find(v => v.is_active)
  const revert = useRevertEndpointToActive(activeTenant, Number(projectId), selectedId ?? 0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<VersionDialogMode>("publish")

  const canPublish = !isNew && !!selectedId
  const nextVersion = (currentEp?.latest_version ?? 0) + 1

  function openDialog(mode: VersionDialogMode) {
    if (!canPublish) {
      toast.error("请先保存接口")
      return
    }
    setDialogMode(mode)
    setDialogOpen(true)
  }

  async function handleUnpublish() {
    const ok = await showConfirm("确认下线此接口？下线后调用方会收到 404；版本历史保留，可随时重新上线。", "下线接口")
    if (!ok) return
    await unpublish.mutateAsync()
  }

  /**
   * "还原到线上 vN"：调原子后端动作。
   * 后端会：把 snapshot 覆盖到 api_endpoints，并把 updated_at 显式写成 activated_at，
   * 这样 has_draft 立刻变 false——不会再出现"点了还原但徽章还显示有未发布修改"的现象。
   */
  async function handleRevertToLive() {
    if (!activeVersion || !selectedId) return
    const ok = await showConfirm(
      `丢弃所有未发布的修改，把草稿恢复到当前线上 v${activeVersion.version}？此操作不可撤销。`,
      "还原到线上版本",
    )
    if (!ok) return
    await revert.mutateAsync()
    // 把本地表单同步到刚刚 revert 出来的内容（用版本 snapshot 重置），
    // 这样 isDirty 立即变 false、屏幕上的 SQL/参数也立刻变回线上的样子。
    // 类型 cast：snapshot 的 SDK 裸 ApiEndpoint 字段全部 optional，initForm 接受的 ApiEndpointResp 字段必填，本质上是同一份数据。
    if (activeVersion.snapshot) initForm(activeVersion.snapshot as ApiEndpoint)
    clearRestoredBanner()
  }

  /**
   * 发布前如果有未保存的草稿，先保存确保版本快照是用户期望的内容。
   * 不弹二次确认——用户已经在 dialog 里写完 note 并点了确认。
   */
  async function ensureDraftSaved(): Promise<boolean> {
    if (!isDirty) return true
    const saved = await save(activeTenant, projectId, false, selectedId)
    return !!saved
  }

  async function handleDialogConfirm(note: string) {
    if (!(await ensureDraftSaved())) return
    try {
      if (dialogMode === "publish") {
        await publish.mutateAsync(note)
      } else {
        await createVersion.mutateAsync(note)
        setActiveTab("releases")
      }
      // 发布/创建版本成功后，当前草稿就是这个新版本本身，不再"基于某历史版本编辑"
      clearRestoredBanner()
      setDialogOpen(false)
    } catch {
      // useAdminMutation 会自己 toast 错误，留弹窗给用户重试
    }
  }

  const dialogLoading = publish.isPending || createVersion.isPending || saving

  return (
    <>
      <div className="h-14 border-b border-border-subtle flex items-center px-6 bg-white shrink-0 gap-3">
        {/* Method (固定宽度，永远在最左) */}
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

        {/* Path (会被压缩，给右侧按钮让位) */}
        <span className={cn(
          "min-w-0 flex-1 text-base font-bold tracking-tight truncate",
          path ? "text-foreground" : "text-zinc-300"
        )}>
          {path || "在 SQL 设计器中编辑路径"}
        </span>

        {/* Status badge */}
        <div className="shrink-0">
          <StatusBadge ep={currentEp ?? undefined} isNew={isNew} />
        </div>

        {/* Publish split button — 左半发布、右半 chevron 下拉里有"仅创建版本" / "下线" */}
        <div className="inline-flex rounded-lg overflow-hidden shadow-sm">
          <Button
            size="sm"
            onClick={() => openDialog("publish")}
            disabled={!canPublish || publish.isPending}
            className="h-8 text-xs pl-3 pr-3 gap-1.5 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {publish.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            发布上线
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={!canPublish}
                className="h-8 px-2.5 rounded-none border-l border-white/40 bg-emerald-600 hover:bg-emerald-700 text-white"
                title="更多发布选项（仅创建版本、不立刻上线）"
                aria-label="更多发布选项"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-64 rounded-lg shadow-modal border-border p-1.5">
              <DropdownMenuItem
                onClick={() => openDialog("create")}
                disabled={createVersion.isPending}
                className="text-xs py-2.5 px-2 rounded-md flex-col items-start gap-1 cursor-pointer focus:bg-primary/5"
              >
                <div className="flex items-center gap-2 w-full">
                  <FilePlus2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-bold text-foreground">仅创建版本（不上线）</span>
                </div>
                <span className="text-2xs text-muted-foreground pl-6 leading-relaxed">
                  打个快照存档；线上接口保持当前版本不变。稍后可在「版本历史」里激活。
                </span>
              </DropdownMenuItem>
              {showRevertEntry && activeVersion && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={handleRevertToLive}
                    disabled={saving}
                    className="text-xs py-2.5 px-2 rounded-md flex-col items-start gap-1 cursor-pointer focus:bg-amber-50 text-zinc-700 focus:text-amber-700"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-bold">还原到线上 v{activeVersion.version}</span>
                    </div>
                    <span className="text-2xs text-muted-foreground pl-6 leading-relaxed">
                      丢弃所有未发布的修改，把草稿恢复成当前线上版本的内容。
                    </span>
                  </DropdownMenuItem>
                </>
              )}
              {currentEp?.is_published && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={handleUnpublish}
                    disabled={unpublish.isPending}
                    className="text-xs py-2.5 px-2 rounded-md flex-col items-start gap-1 cursor-pointer focus:bg-red-50 text-zinc-700 focus:text-red-700"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <WifiOff className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="font-bold">下线接口</span>
                    </div>
                    <span className="text-2xs text-muted-foreground pl-6 leading-relaxed">
                      让接口暂停对外服务，访问会返回 404。版本历史保留，随时可以重新上线。
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <VersionNoteDialog
        open={dialogOpen}
        mode={dialogMode}
        nextVersion={nextVersion}
        loading={dialogLoading}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDialogConfirm}
      />
    </>
  )
}
