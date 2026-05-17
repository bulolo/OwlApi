"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { CheckCircle2, Circle, Rocket, RotateCcw, ChevronDown, ChevronRight, History, ArrowUpRight, GitCompare, Activity, List, Trash2, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useEndpointVersions, useActivateEndpointVersion, useDeleteEndpointVersion, useUnpublishEndpoint } from "@/hooks/useEndpointVersions"
import { useUsers } from "@/hooks/useUsers"
import { showConfirm } from "@/store/useConfirmStore"
import { toast } from "sonner"
import type { EndpointVersion } from "@/lib/api-client"
import { VersionDiff } from "./VersionDiff"
import { ActivationLog } from "./ActivationLog"

type ReleasesView = "versions" | "log"

function formatDate(d: string) {
  try { return format(new Date(d), "yyyy-MM-dd HH:mm") } catch { return d }
}

export function ReleasesTab() {
  const { activeTenant, projectId } = useTenantProject()
  const selectedId = useApiEditorStore(s => s.selectedId)
  const setActiveTab = useApiEditorStore(s => s.setActiveTab)
  const restoreFromVersion = useEndpointFormStore(s => s.restoreFromVersion)
  const isDirty = useEndpointFormStore(s => s.isDirty)

  const [view, setView] = useState<ReleasesView>("versions")

  const { versions, isLoading, refetch } = useEndpointVersions(activeTenant, Number(projectId), selectedId ?? 0)
  const activate = useActivateEndpointVersion(activeTenant, Number(projectId), selectedId ?? 0)
  const deleteVersion = useDeleteEndpointVersion(activeTenant, Number(projectId), selectedId ?? 0)
  const unpublish = useUnpublishEndpoint(activeTenant, Number(projectId), selectedId ?? 0)
  const { users } = useUsers(activeTenant, { is_pager: 0 })

  const userById = (uid: number): string => {
    if (!uid) return "系统"
    const u = users.find(tu => tu.user_id === uid)
    return u?.user?.name ?? `用户#${uid}`
  }

  // 最大版本号 = 最新版本；非 active 但等于 latest 即"待上线"
  const latestVersion = versions.reduce((max, v) => Math.max(max, v.version ?? 0), 0)

  async function handleActivate(v: EndpointVersion) {
    const ok = await showConfirm(`确认切换到 v${v.version} 并上线？此操作会立刻改变线上接口。`, "切换上线版本")
    if (!ok) return
    await activate.mutateAsync(v.id)
    await refetch()
  }

  async function handleCopyToEditor(v: EndpointVersion) {
    if (!v.snapshot) return
    if (isDirty) {
      const ok = await showConfirm("当前有未保存的修改，复制此版本将覆盖编辑器内容。继续？", "复制到编辑器")
      if (!ok) return
    }
    restoreFromVersion(v)
    setActiveTab("design")
    toast.success(`已把 v${v.version} 载入编辑器`)
  }

  async function handleDelete(v: EndpointVersion) {
    const ok = await showConfirm(
      `确认删除 v${v.version}？此操作不可恢复。历史流水将显示为"已删除"。`,
      "删除版本",
    )
    if (!ok) return
    await deleteVersion.mutateAsync(v.id)
    await refetch()
  }

  async function handleUnpublish() {
    const ok = await showConfirm("确认下线此接口？下线后调用方会收到 404；版本历史保留，可随时重新上线。", "下线接口")
    if (!ok) return
    await unpublish.mutateAsync()
    await refetch()
  }

  if (!selectedId) return null

  const activeVersion = versions.find(v => v.is_active)
  const hasPending = latestVersion > 0 && activeVersion && activeVersion.version < latestVersion

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4 gap-4">
        <h3 className="text-sm font-bold text-zinc-700">版本历史</h3>

        {/* 视图切换：版本列表 / 操作流水 */}
        <div className="inline-flex bg-zinc-100/80 rounded-lg p-0.5 border border-border-subtle">
          <button
            onClick={() => setView("versions")}
            className={cn(
              "inline-flex items-center gap-1.5 text-2xs font-bold px-3 py-1 rounded-md transition-colors",
              view === "versions"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-zinc-700",
            )}
          >
            <List className="w-3 h-3" /> 版本列表
          </button>
          <button
            onClick={() => setView("log")}
            className={cn(
              "inline-flex items-center gap-1.5 text-2xs font-bold px-3 py-1 rounded-md transition-colors",
              view === "log"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-zinc-700",
            )}
          >
            <Activity className="w-3 h-3" /> 操作流水
          </button>
        </div>
      </div>

      {/* Summary（仅 versions 视图展示） */}
      {view === "versions" && versions.length > 0 && (
        <div className="flex items-center gap-3 text-2xs mb-3">
          {activeVersion ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              线上 <strong className="font-black">v{activeVersion.version}</strong>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              已下线
            </span>
          )}
          {hasPending && (
            <span className="inline-flex items-center gap-1 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              最新 <strong className="font-black">v{latestVersion}</strong> 待上线
            </span>
          )}
          <span className="text-muted-foreground">共 {versions.length} 个版本</span>
          {activeVersion && (
            <Button
              size="sm"
              variant="ghost"
              disabled={unpublish.isPending}
              onClick={handleUnpublish}
              className="ml-auto h-6 px-2 text-2xs text-muted-foreground hover:text-red-600 hover:bg-red-50"
              title="让接口暂停对外服务，访问会返回 404；版本历史会保留"
            >
              <WifiOff className="w-3 h-3 mr-1" /> 下线接口
            </Button>
          )}
        </div>
      )}

      {view === "versions" ? (
        isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">加载中...</div>
        ) : versions.length === 0 ? (
          <VersionEmptyState />
        ) : (
          <div className="space-y-2">
            {versions.map(v => (
              <VersionRow
                key={v.id}
                version={v}
                versions={versions}
                isLatest={v.version === latestVersion}
                creatorName={userById(v.created_by ?? 0)}
                onActivate={handleActivate}
                activating={activate.isPending}
                onCopyToEditor={v.snapshot ? () => handleCopyToEditor(v) : undefined}
                onDelete={versions.length > 1 && !v.is_active ? () => handleDelete(v) : undefined}
                deleting={deleteVersion.isPending}
              />
            ))}
          </div>
        )
      ) : (
        <ActivationLog slug={activeTenant} projectId={Number(projectId)} endpointId={selectedId} />
      )}
    </div>
  )
}

function VersionRow({ version, versions, isLatest, creatorName, onActivate, activating, onCopyToEditor, onDelete, deleting }: {
  version: EndpointVersion
  versions: EndpointVersion[]
  isLatest: boolean
  creatorName: string
  onActivate: (v: EndpointVersion) => void
  activating: boolean
  onCopyToEditor?: () => void
  onDelete?: () => void
  deleting?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  // 默认对比基准 = 上一个版本号；用户可在 dropdown 里改成任意其他版本
  const defaultBase = useMemo(() => {
    const prev = versions.find(v => v.version === (version.version ?? 0) - 1)
    return prev?.id ?? 0
  }, [versions, version.version])
  const [compareWithId, setCompareWithId] = useState<number>(defaultBase)
  const compareWith = versions.find(v => v.id === compareWithId)
  const snap = version.snapshot
  // 最新版但不是当前生效 → "待上线"。比如 v4 已创建但还没激活，v3 仍是 active 状态时 v4 = 待上线。
  const isPending = isLatest && !version.is_active

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      version.is_active
        ? "border-emerald-100 bg-emerald-50/40"
        : isPending
          ? "border-primary/20 bg-primary/5"
          : "border-border-subtle bg-white"
    )}>
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="shrink-0">
          {version.is_active
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : isPending
              ? <Circle className="w-4 h-4 text-primary fill-primary/20" />
              : <Circle className="w-4 h-4 text-zinc-300" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-foreground">v{version.version}</span>
            {version.is_active && (
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                上线中
              </span>
            )}
            {isPending && (
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                待上线
              </span>
            )}
            {snap && (
              <span className="text-xs text-muted-foreground font-mono truncate">
                {(snap.methods?.[0] ?? "").toUpperCase()} {snap.path}
              </span>
            )}
          </div>
          {/* 发布说明 — 行头直接预览第一行；空说明显示灰色占位 */}
          <p className={cn(
            "text-xs mt-0.5 truncate",
            version.note ? "text-zinc-700" : "text-zinc-300 italic"
          )}>
            {version.note || "（未填写发布说明）"}
          </p>
          <p className="text-2xs text-muted-foreground mt-0.5">
            {creatorName} · {formatDate(version.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onCopyToEditor && (
            <Button
              size="sm"
              variant="ghost"
              onClick={e => { e.stopPropagation(); onCopyToEditor() }}
              className="h-7 px-3 text-xs text-muted-foreground hover:bg-zinc-100"
              title="把此版本的 SQL/参数复制到编辑器（不会改变线上）"
            >
              <RotateCcw className="w-3 h-3 mr-1.5" /> 复制到编辑器
            </Button>
          )}
          {!version.is_active && (
            <Button
              size="sm"
              variant="outline"
              disabled={activating}
              onClick={e => { e.stopPropagation(); onActivate(version) }}
              className="h-7 px-3 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              title="立刻把线上接口切到此版本"
            >
              <Rocket className="w-3 h-3 mr-1.5" /> 切换到此版本
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              disabled={deleting}
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              title="删除此版本（不可恢复）"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Snapshot detail */}
      {expanded && snap && (
        <div className="border-t border-border-subtle px-4 py-3 space-y-4">
          {/* 发布说明 — 放在最上面，多行原样展示 */}
          <div>
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">发布说明</p>
            <div className={cn(
              "text-xs rounded-lg p-3 border whitespace-pre-wrap break-words leading-relaxed",
              version.note
                ? "text-zinc-700 bg-amber-50/40 border-amber-100"
                : "text-zinc-300 italic bg-zinc-50 border-border-subtle"
            )}>
              {version.note || "（未填写发布说明）"}
            </div>
          </div>

          {/* 与某个版本的差异（默认对比上一个版本，可下拉切换） */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <GitCompare className="w-3 h-3" /> 与历史版本对比
              </p>
              {versions.length > 1 && (
                <select
                  value={compareWithId}
                  onChange={e => setCompareWithId(Number(e.target.value))}
                  onClick={e => e.stopPropagation()}
                  className="text-2xs font-medium border border-border rounded px-2 py-0.5 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value={0}>—— 选择对比版本 ——</option>
                  {versions
                    .filter(v => v.id !== version.id)
                    .map(v => (
                      <option key={v.id} value={v.id}>
                        v{v.version}{v.is_active ? " · 上线中" : ""}
                      </option>
                    ))}
                </select>
              )}
            </div>
            <VersionDiff current={version} previous={compareWith} />
          </div>

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

          {/* Scripts (snapshot, frozen at version creation) */}
          {(version.pre_script_snapshot || version.post_script_snapshot) && (
            <div className="grid grid-cols-1 gap-3">
              {version.pre_script_snapshot && (
                <div>
                  <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    前置脚本快照 · {version.pre_script_snapshot.name}
                  </p>
                  <pre className="text-xs text-zinc-700 bg-zinc-50 border border-border-subtle rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed font-mono">
                    {version.pre_script_snapshot.code}
                  </pre>
                </div>
              )}
              {version.post_script_snapshot && (
                <div>
                  <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    后置脚本快照 · {version.post_script_snapshot.name}
                  </p>
                  <pre className="text-xs text-zinc-700 bg-zinc-50 border border-border-subtle rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed font-mono">
                    {version.post_script_snapshot.code}
                  </pre>
                </div>
              )}
            </div>
          )}

          {version.datasource_ref && (
            <div>
              <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">数据源引用</p>
              <p className="text-xs text-zinc-700 font-mono">
                {version.datasource_ref.name}（{version.datasource_ref.type}, id={version.datasource_ref.id}）
                <span className="text-muted-foreground"> — DSN 始终使用最新</span>
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

function VersionEmptyState() {
  return (
    <div className="border border-dashed border-border rounded-xl py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4 border border-border-subtle">
        <History className="w-6 h-6 text-zinc-300" />
      </div>
      <p className="text-sm font-bold text-zinc-700">还没有任何版本</p>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
        版本是接口配置的不可变快照。每次发布上线会自动创建一个版本，方便回滚和审计。
      </p>
      <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 rounded-lg border border-border-subtle">
        <ArrowUpRight className="w-3 h-3 text-primary" />
        点击右上角的<span className="font-bold text-foreground">「发布上线」</span>创建第一个版本
      </p>
    </div>
  )
}
