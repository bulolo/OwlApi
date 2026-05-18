"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { CheckCircle2, Circle, Rocket, RotateCcw, ChevronDown, ChevronRight, History, ArrowUpRight, GitCompare, Activity, List, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useEnvironments } from "@/hooks"
import {
  useEndpointVersions,
  useEndpointActives,
  useActivateEndpointVersion,
  useDeleteEndpointVersion,
  useUnpublishEndpoint,
} from "@/hooks/useEndpointVersions"
import { useUsers } from "@/hooks/useUsers"
import { showConfirm } from "@/store/useConfirmStore"
import { toast } from "sonner"
import type { EndpointVersion } from "@/lib/api-client"
import { VersionDiff } from "./VersionDiff"
import { ActivationLog } from "./ActivationLog"

type ReleasesView = "versions" | "log"

import { envColor } from "../../_utils/envColor"

const envDotColor = (name: string) => envColor(name).bg

function formatDate(d: string) {
  try { return format(new Date(d), "yyyy-MM-dd HH:mm") } catch { return d }
}

export function ReleasesTab() {
  const { activeTenant, projectId } = useTenantProject()
  const { data: envs = [] } = useEnvironments(activeTenant, Number(projectId))
  const selectedId = useApiEditorStore(s => s.selectedId)
  const setActiveTab = useApiEditorStore(s => s.setActiveTab)
  const restoreFromVersion = useEndpointFormStore(s => s.restoreFromVersion)
  const isDirty = useEndpointFormStore(s => s.isDirty)

  const [view, setView] = useState<ReleasesView>("versions")

  const { versions, isLoading, refetch } = useEndpointVersions(activeTenant, Number(projectId), selectedId ?? 0)
  const { data: actives = [], refetch: refetchActives } = useEndpointActives(activeTenant, Number(projectId), selectedId ?? 0)
  const activate = useActivateEndpointVersion(activeTenant, Number(projectId), selectedId ?? 0)
  const deleteVersion = useDeleteEndpointVersion(activeTenant, Number(projectId), selectedId ?? 0)
  const unpublish = useUnpublishEndpoint(activeTenant, Number(projectId), selectedId ?? 0)
  const { users } = useUsers(activeTenant, { is_pager: 0 })

  const userById = (uid: number): string => {
    if (!uid) return "系统"
    const u = users.find(tu => tu.user_id === uid)
    return u?.user?.name ?? `用户#${uid}`
  }

  // Map env_id → env name for activation badges; map version_id → list of envs active.
  const envNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const e of envs) m.set(e.id, e.name)
    return m
  }, [envs])
  const activesByVersion = useMemo(() => {
    const m = new Map<number, { envId: number; envName: string }[]>()
    for (const av of actives) {
      const arr = m.get(av.version_id) ?? []
      arr.push({ envId: av.env_id, envName: envNameById.get(av.env_id) ?? `env#${av.env_id}` })
      m.set(av.version_id, arr)
    }
    return m
  }, [actives, envNameById])

  const latestVersion = versions.reduce((max, v) => Math.max(max, v.version ?? 0), 0)

  async function handleActivate(v: EndpointVersion, envId: number) {
    const envName = envNameById.get(envId) ?? ''
    const ok = await showConfirm(`确认在 ${envName} 上线 v${v.version}？此操作会立刻改变该环境的线上接口。`, "上线")
    if (!ok) return
    await activate.mutateAsync({ versionId: v.id, envId })
    await Promise.all([refetch(), refetchActives()])
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
      `确认删除 v${v.version}？此操作不可恢复。`,
      "删除版本",
    )
    if (!ok) return
    await deleteVersion.mutateAsync(v.id)
    await Promise.all([refetch(), refetchActives()])
  }

  async function handleUnpublishEnv(envId: number) {
    const envName = envNameById.get(envId) ?? ''
    const ok = await showConfirm(`确认在 ${envName} 下线此接口？仅此环境受影响。`, "下线接口")
    if (!ok) return
    await unpublish.mutateAsync(envId)
    await Promise.all([refetch(), refetchActives()])
  }

  if (!selectedId) return null

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4 gap-4">
        <h3 className="text-sm font-bold text-zinc-700">版本管理</h3>

        <div className="inline-flex bg-zinc-100/80 rounded-lg p-0.5 border border-border-subtle">
          <button
            onClick={() => setView("versions")}
            className={cn(
              "inline-flex items-center gap-1.5 text-2xs font-bold px-3 py-1 rounded-md transition-colors",
              view === "versions" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-zinc-700",
            )}
          >
            <List className="w-3 h-3" /> 版本列表
          </button>
          <button
            onClick={() => setView("log")}
            className={cn(
              "inline-flex items-center gap-1.5 text-2xs font-bold px-3 py-1 rounded-md transition-colors",
              view === "log" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-zinc-700",
            )}
          >
            <Activity className="w-3 h-3" /> 操作流水
          </button>
        </div>
      </div>

      {view === "versions" && versions.length > 0 && (
        <div className="flex items-center text-2xs text-muted-foreground mb-3">
          共 {versions.length} 个版本
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
                activeEnvs={activesByVersion.get(v.id) ?? []}
                envs={envs.map(e => ({ id: e.id, name: e.name }))}
                creatorName={userById(v.created_by ?? 0)}
                onActivate={handleActivate}
                onUnpublish={handleUnpublishEnv}
                activating={activate.isPending || unpublish.isPending}
                onCopyToEditor={v.snapshot ? () => handleCopyToEditor(v) : undefined}
                onDelete={!(activesByVersion.get(v.id)?.length) ? () => handleDelete(v) : undefined}
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

function VersionRow({
  version, versions, isLatest, activeEnvs, envs,
  creatorName, onActivate, onUnpublish, activating, onCopyToEditor, onDelete, deleting,
}: {
  version: EndpointVersion
  versions: EndpointVersion[]
  isLatest: boolean
  activeEnvs: { envId: number; envName: string }[]
  envs: { id: number; name: string }[]
  creatorName: string
  onActivate: (v: EndpointVersion, envId: number) => void
  onUnpublish: (envId: number) => void
  activating: boolean
  onCopyToEditor?: () => void
  onDelete?: () => void
  deleting?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const defaultBase = useMemo(() => {
    const prev = versions.find(v => v.version === (version.version ?? 0) - 1)
    return prev?.id ?? 0
  }, [versions, version.version])
  const [compareWithId, setCompareWithId] = useState<number>(defaultBase)
  const compareWith = versions.find(v => v.id === compareWithId)
  const snap = version.snapshot
  const isPending = isLatest && activeEnvs.length === 0

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      activeEnvs.length > 0
        ? "border-emerald-100 bg-emerald-50/40"
        : isPending
          ? "border-primary/20 bg-primary/5"
          : "border-border-subtle bg-white"
    )}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
        <div className="shrink-0">
          {activeEnvs.length > 0
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : isPending
              ? <Circle className="w-4 h-4 text-primary fill-primary/20" />
              : <Circle className="w-4 h-4 text-zinc-300" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-foreground">v{version.version}</span>
            {activeEnvs.map(ae => (
              <span
                key={ae.envId}
                className="text-2xs font-bold px-1.5 py-0.5 rounded tracking-tight border inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 border-emerald-200"
                title={`在 ${ae.envName} 激活中`}
              >
                <span className={cn("w-1 h-1 rounded-full", envDotColor(ae.envName))} />
                {ae.envName}
              </span>
            ))}
            {isPending && activeEnvs.length === 0 && (
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">待上线</span>
            )}
            {snap && (
              <span className="text-xs text-muted-foreground font-mono truncate">
                {(snap.methods?.[0] ?? "").toUpperCase()} {snap.path}
              </span>
            )}
          </div>
          <p className={cn("text-xs mt-0.5 truncate", version.note ? "text-zinc-700" : "text-zinc-300 italic")}>
            {version.note || "（未填写发布说明）"}
          </p>
          <p className="text-2xs text-muted-foreground mt-0.5">
            {creatorName} · {formatDate(version.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onCopyToEditor && (
            <Button
              size="sm" variant="ghost"
              onClick={e => { e.stopPropagation(); onCopyToEditor() }}
              className="h-7 px-3 text-xs text-muted-foreground hover:bg-zinc-100"
              title="把此版本的 SQL/参数复制到编辑器（不会改变线上）"
            >
              <RotateCcw className="w-3 h-3 mr-1.5" /> 复制到编辑器
            </Button>
          )}
          {/* 统一的"上线到 ▾"——所有 env 列出来，已上线的勾选+置灰，未上线的可点击。
              替代之前"激活到 X" + "Promote" 双按钮的歧义。 */}
          {envs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm" variant="outline"
                  disabled={activating}
                  onClick={e => e.stopPropagation()}
                  className="h-7 px-3 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  title="选择一个环境让这个版本在该环境生效"
                >
                  <Rocket className="w-3 h-3 mr-1.5" /> 上线到 <ChevronDown className="w-3 h-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-lg shadow-modal border-border p-1">
                <div className="px-2 pt-1 pb-1.5 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                  在该环境激活此版本
                </div>
                {envs.map(env => {
                  const activeInEnv = activeEnvs.some(ae => ae.envId === env.id)
                  if (activeInEnv) {
                    return (
                      <DropdownMenuItem
                        key={env.id}
                        onClick={() => onUnpublish(env.id)}
                        className="text-xs font-bold py-2 rounded-md flex items-center gap-2 focus:bg-red-50"
                        title={`从 ${env.name} 下线`}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", envDotColor(env.name))} />
                        <span className="flex-1">{env.name}</span>
                        <span className="text-2xs font-bold text-emerald-600">✓ 已上线</span>
                        <span className="text-2xs text-muted-foreground">点击下线</span>
                      </DropdownMenuItem>
                    )
                  }
                  return (
                    <DropdownMenuItem
                      key={env.id}
                      onClick={() => onActivate(version, env.id)}
                      className="text-xs font-bold py-2 rounded-md flex items-center gap-2"
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", envDotColor(env.name))} />
                      <span className="flex-1">{env.name}</span>
                      <span className="text-2xs text-muted-foreground">点击上线</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onDelete && (
            <Button
              size="sm" variant="ghost" disabled={deleting}
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              title="删除此版本（任何 env 仍在使用则不可删）"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && snap && (
        <div className="border-t border-border-subtle px-4 py-3 space-y-4">
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
                  className="text-2xs font-medium border border-border rounded px-2 py-0.5 bg-white text-zinc-700"
                >
                  <option value={0}>—— 选择对比版本 ——</option>
                  {versions.filter(v => v.id !== version.id).map(v => (
                    <option key={v.id} value={v.id}>v{v.version}</option>
                  ))}
                </select>
              )}
            </div>
            <VersionDiff current={version} previous={compareWith} />
          </div>

          <div>
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">SQL</p>
            <pre className="text-xs text-zinc-700 bg-zinc-50 border border-border-subtle rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed font-mono">
              {snap.sql ?? "—"}
            </pre>
          </div>

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

          {version.datasource_ref && (
            <div>
              <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">数据源别名引用</p>
              <p className="text-xs text-zinc-700 font-mono">
                {version.datasource_ref.alias}
                <span className="text-muted-foreground"> — 运行时按 env 解析具体物理库</span>
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
        版本是接口配置的不可变快照。回到设计 tab 点击「创建版本」打第一个快照后，再回这里上线到具体 env。
      </p>
      <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 rounded-lg border border-border-subtle">
        <ArrowUpRight className="w-3 h-3 text-primary" />
        到 <span className="font-bold text-foreground">设计</span> tab 点右上角的<span className="font-bold text-foreground">「创建版本」</span>
      </p>
    </div>
  )
}
