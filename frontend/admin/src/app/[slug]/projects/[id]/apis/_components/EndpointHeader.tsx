"use client"

import { useState } from "react"
import { FilePlus2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useEndpointsQuery } from "../_hooks/useEndpointsQuery"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useCreateEndpointVersion, useEndpointActives } from "@/hooks/useEndpointVersions"
import { useEnvironments } from "@/hooks"
import { envColor } from "../../_utils/envColor"

import { VersionNoteDialog } from "./VersionNoteDialog"

/**
 * 接口编辑器顶栏（去掉全局 env 切换器之后的版本）：
 *   左：HTTP method + path
 *   中：每个 env 当前激活版本的并列徽章（不再有"当前 env"）
 *   右：[发布 ▾] —— 点开下拉里 *显式选择* 要发到哪个 env
 *
 * 设计要点：
 *   • 每次发布都要在按钮里明确选 env，杜绝"我以为切到 dev 编辑，结果改的是共享草稿"的误解
 *   • 状态显示从单一徽章 → 多 env 并列，所有环境一眼可见
 *   • 下线 / 还原 这些 per-env 动作搬到「版本管理」tab 里，按版本和 env 操作更精准
 */
export function EndpointHeader() {
  const { activeTenant, projectId } = useTenantProject()
  const { data: envs = [] } = useEnvironments(activeTenant, Number(projectId))

  const method = useEndpointFormStore(s => s.form.method)
  const path = useEndpointFormStore(s => s.form.path)
  const isDirty = useEndpointFormStore(s => s.isDirty)
  const saving = useEndpointFormStore(s => s.saving)
  const save = useEndpointFormStore(s => s.save)
  const clearRestoredBanner = useEndpointFormStore(s => s.clearRestoredBanner)

  const isNew = useApiEditorStore(s => s.isNew)
  const selectedId = useApiEditorStore(s => s.selectedId)
  const setActiveTab = useApiEditorStore(s => s.setActiveTab)

  const { list: endpoints } = useEndpointsQuery(activeTenant, projectId)
  const currentEp = !isNew && selectedId
    ? endpoints.find(e => e.id === selectedId)
    : null

  const { data: actives = [] } = useEndpointActives(activeTenant, Number(projectId), selectedId ?? 0)
  const versionByEnv = new Map(actives.map(a => [a.env_id, a.version]))

  const createVersion = useCreateEndpointVersion(activeTenant, Number(projectId), selectedId ?? 0)

  const [dialogOpen, setDialogOpen] = useState(false)

  const canPublish = !isNew && !!selectedId
  const nextVersion = (currentEp?.latest_version ?? 0) + 1

  function openCreateVersionDialog() {
    if (!canPublish) {
      toast.error("请先保存接口")
      return
    }
    setDialogOpen(true)
  }

  async function ensureDraftSaved(): Promise<boolean> {
    if (!isDirty) return true
    const saved = await save(activeTenant, projectId, false, selectedId)
    return !!saved
  }

  async function handleDialogConfirm(note: string) {
    if (!(await ensureDraftSaved())) return
    try {
      await createVersion.mutateAsync(note)
      clearRestoredBanner()
      setDialogOpen(false)
      // 引导用户去版本管理 tab 做"上线"
      setActiveTab("releases")
    } catch {
      // useAdminMutation 会自己 toast
    }
  }

  const dialogLoading = createVersion.isPending || saving

  return (
    <>
      <div className="h-14 border-b border-border-subtle flex items-center px-6 bg-white shrink-0 gap-3">
        {/* Method */}
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

        {/* Path */}
        <span className={cn(
          "min-w-0 flex-1 text-base font-bold tracking-tight truncate",
          path ? "text-foreground" : "text-zinc-300"
        )}>
          {path || "在 SQL 设计器中编辑路径"}
        </span>

        {/* Per-env activation chips */}
        {!isNew && envs.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {envs.map(env => {
              const v = versionByEnv.get(env.id)
              return (
                <span
                  key={env.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-2xs font-bold px-2 py-0.5 rounded-md border",
                    v
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-zinc-50 text-zinc-400 border-zinc-200",
                  )}
                  title={v ? `${env.name} 当前线上 v${v}` : `${env.name} 未上线`}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", envColor(env.name).bg)} />
                  <span>{env.name}</span>
                  <span className={cn("font-mono", v ? "text-emerald-800" : "text-zinc-400")}>
                    {v ? `v${v}` : "—"}
                  </span>
                </span>
              )
            })}
            {currentEp?.has_draft && (
              <span className="text-2xs font-bold px-2 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200">
                草稿未发布
              </span>
            )}
          </div>
        )}

        {/* 只创建版本，不上线。上线动作在版本管理 tab 做。 */}
        <Button
          size="sm"
          onClick={openCreateVersionDialog}
          disabled={!canPublish || createVersion.isPending}
          className="h-8 text-xs px-3 gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white"
          title={`冻结当前草稿为 v${nextVersion}，不会自动上线到任何环境`}
        >
          {createVersion.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <FilePlus2 className="w-3.5 h-3.5" />}
          创建版本 v{nextVersion}
        </Button>
      </div>

      <VersionNoteDialog
        open={dialogOpen}
        mode="create"
        nextVersion={nextVersion}
        loading={dialogLoading}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDialogConfirm}
      />
    </>
  )
}
