"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CheckCircle2, Circle, Rocket, RotateCcw, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useReleases, useActivateRelease } from "@/hooks/useReleases"
import { showConfirm } from "@/store/useConfirmStore"
import type { EndpointRelease } from "@/lib/api-client"

function formatDate(d: string) {
  try { return format(new Date(d), "yyyy-MM-dd HH:mm") } catch { return d }
}

export function ReleasesTab() {
  const { activeTenant, projectId } = useTenantProject()
  const selectedId = useApiEditorStore(s => s.selectedId)
  const restoreSnapshot = useEndpointFormStore(s => s.restoreSnapshot)

  const { releases, isLoading, refetch } = useReleases(activeTenant, Number(projectId), selectedId ?? 0)
  const activate = useActivateRelease(activeTenant, Number(projectId), selectedId ?? 0)

  const published = releases.filter(r => !r.is_draft)

  async function handleActivate(rel: EndpointRelease) {
    const ok = await showConfirm(`确认将 v${rel.version} 上线？`, "上线")
    if (!ok) return
    await activate.mutateAsync(rel.id)
    await refetch()
  }

  if (!selectedId) return null

  return (
    <div className="p-6 max-w-3xl">
      <h3 className="text-sm font-bold text-zinc-700 mb-4">版本历史</h3>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">加载中...</div>
      ) : published.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">暂无发布记录</div>
      ) : (
        <div className="space-y-2">
          {published.map(rel => (
            <ReleaseRow
              key={rel.id}
              release={rel}
              onActivate={handleActivate}
              activating={activate.isPending}
              onRestoreEdit={rel.snapshot ? () => restoreSnapshot(rel.snapshot!) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ReleaseRow({ release, onActivate, activating, onRestoreEdit }: {
  release: EndpointRelease
  onActivate: (r: EndpointRelease) => void
  activating: boolean
  onRestoreEdit?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const snap = release.snapshot

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      release.is_active ? "border-emerald-100 bg-emerald-50/40" : "border-border-subtle bg-white"
    )}>
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="shrink-0">
          {release.is_active
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <Circle className="w-4 h-4 text-zinc-300" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-foreground">v{release.version}</span>
            {release.is_active && (
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                上线中
              </span>
            )}
            {snap && (
              <span className="text-xs text-muted-foreground font-mono truncate">
                {(snap.methods?.[0] ?? "").toUpperCase()} {snap.path}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(release.published_at)}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRestoreEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={e => { e.stopPropagation(); onRestoreEdit() }}
              className="h-7 px-3 text-xs text-muted-foreground hover:bg-zinc-100"
            >
              <RotateCcw className="w-3 h-3 mr-1.5" /> 恢复编辑
            </Button>
          )}
          {!release.is_active && (
            <Button
              size="sm"
              variant="outline"
              disabled={activating}
              onClick={e => { e.stopPropagation(); onActivate(release) }}
              className="h-7 px-3 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <Rocket className="w-3 h-3 mr-1.5" /> 上线
            </Button>
          )}
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Snapshot detail */}
      {expanded && snap && (
        <div className="border-t border-border-subtle px-4 py-3 space-y-3">
          {/* SQL */}
          <div>
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">SQL</p>
            <pre className="text-xs text-zinc-700 bg-zinc-50 border border-border-subtle rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed font-mono">
              {snap.sql ?? "—"}
            </pre>
          </div>

          {/* Params */}
          {snap.param_defs && snap.param_defs.length > 0 && (
            <div>
              <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">参数</p>
              <div className="flex flex-wrap gap-1.5">
                {snap.param_defs.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-muted-foreground">{p.type}</span>
                    {p.required && <span className="text-red-500">*</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
