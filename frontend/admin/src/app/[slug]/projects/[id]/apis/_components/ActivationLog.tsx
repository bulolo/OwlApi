"use client"

import { format } from "date-fns"
import { Rocket, RotateCcw, ArrowDownCircle, Activity, Trash2, GitCommitHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEndpointActivationLog } from "@/hooks/useEndpointVersions"
import type { EndpointActivationLogResp as EndpointActivationLog } from "@/lib/sdk"

function formatDate(d: string) {
  try { return format(new Date(d), "yyyy-MM-dd HH:mm:ss") } catch { return d }
}

interface ActivationLogProps {
  slug: string
  projectId: number
  endpointId: number
}

/**
 * 接口的"激活流水"时间线：publish / activate / rollback / unpublish 全部按时间倒序展示。
 * 操作人名字 (actor_name) 和版本号 (version) 都由后端直接 JOIN 出来，前端不再二次查询。
 * 这样可以正确显示超管（tenant_users 列表排除了超管，前端单独查不到）。
 */
export function ActivationLog({ slug, projectId, endpointId }: ActivationLogProps) {
  const { logs, isLoading } = useEndpointActivationLog(slug, projectId, endpointId, { is_pager: 0 })

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">加载中...</div>
  }

  if (logs.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl py-12 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4 border border-border-subtle">
          <Activity className="w-6 h-6 text-zinc-300" />
        </div>
        <p className="text-sm font-bold text-zinc-700">还没有任何操作记录</p>
        <p className="text-xs text-muted-foreground mt-1.5">发布、切换版本、下线等操作都会在这里留痕。</p>
      </div>
    )
  }

  return (
    <ul className="relative border-l-2 border-border-subtle ml-2 space-y-4 pl-6 py-1">
      {logs.map((log: EndpointActivationLog) => {
        const actor = log.actor_name || (log.actor_id ? `用户 #${log.actor_id}` : "系统")
        const versionLabel = log.version
          ? `v${log.version}`
          : log.version_id
            ? `已删除 #${log.version_id}`
            : ""
        return <LogRow key={log.id} log={log} actor={actor} versionLabel={versionLabel} envName={log.env_name ?? ""} />
      })}
    </ul>
  )
}

interface ActionMeta {
  Icon: typeof Rocket
  tone: "emerald" | "primary" | "amber" | "zinc"
  describe: (versionLabel: string) => React.ReactNode
}

function Ver({ label, cls }: { label: string; cls: string }) {
  if (!label) return null
  return <strong className={cn("font-bold", cls)}>{label}</strong>
}

const actionMeta: Record<string, ActionMeta> = {
  version_create: {
    Icon: GitCommitHorizontal,
    tone: "zinc",
    describe: (v) => <>创建了 <Ver label={v} cls="text-zinc-600" /> 版本快照</>,
  },
  publish: {
    Icon: Rocket,
    tone: "emerald",
    describe: (v) => <>上线 <Ver label={v} cls="text-emerald-700" /> 版本</>,
  },
  activate: {
    Icon: Rocket,
    tone: "emerald",
    describe: (v) => <>上线 <Ver label={v} cls="text-emerald-700" /> 版本</>,
  },
  promote: {
    Icon: Rocket,
    tone: "emerald",
    describe: (v) => <>上线 <Ver label={v} cls="text-emerald-700" /> 版本</>,
  },
  rollback: {
    Icon: RotateCcw,
    tone: "amber",
    describe: (v) => <>回滚至 <Ver label={v} cls="text-amber-700" /> 版本</>,
  },
  unpublish: {
    Icon: ArrowDownCircle,
    tone: "zinc",
    describe: () => <>将接口下线（调用方会收到 404）</>,
  },
  version_deleted: {
    Icon: Trash2,
    tone: "zinc",
    describe: (v) => <>删除了 <Ver label={v} cls="text-zinc-700" /> 版本</>,
  },
  revert: {
    Icon: RotateCcw,
    tone: "amber",
    describe: (v) => <>还原至 <Ver label={v} cls="text-amber-700" /> 版本</>,
  },
}

function LogRow({ log, actor, versionLabel, envName }: { log: EndpointActivationLog; actor: string; versionLabel: string; envName: string }) {
  const meta = actionMeta[log.action] ?? {
    Icon: Activity,
    tone: "zinc" as const,
    describe: (v: string) => <>{log.action}{v ? ` · ${v}` : ""}</>,
  }
  const dotCls = {
    emerald: "bg-emerald-500 ring-emerald-100",
    primary: "bg-primary ring-primary/20",
    amber: "bg-amber-500 ring-amber-100",
    zinc: "bg-zinc-400 ring-zinc-100",
  }[meta.tone]
  const iconBgCls = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    primary: "bg-primary/10 text-primary border-primary/30",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    zinc: "bg-zinc-50 text-zinc-500 border-border",
  }[meta.tone]

  return (
    <li className="relative">
      <span className={cn(
        "absolute -left-[33px] top-1.5 w-3 h-3 rounded-full ring-4",
        dotCls,
      )} />
      <div className="flex items-start gap-3">
        <div className={cn(
          "shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center",
          iconBgCls,
        )}>
          <meta.Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-700">
            <span className="font-bold text-foreground">{actor}</span>
            <span className="text-muted-foreground"> · </span>
            {meta.describe(versionLabel)}
            {envName && (
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-zinc-100 text-zinc-500 border border-border-subtle align-middle">
                {envName}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{formatDate(log.at)}</p>
        </div>
      </div>
    </li>
  )
}
