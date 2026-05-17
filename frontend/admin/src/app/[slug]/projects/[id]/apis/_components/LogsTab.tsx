"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ScrollText, RotateCw, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useEndpointCallLogs } from "@/hooks/useEndpointCallLogs"
import type { EndpointCallLog, CallLogQuery } from "@/lib/api-client"

type StatusFilter = 'all' | '2xx' | '4xx' | '5xx'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '2xx', label: '成功' },
  { value: '4xx', label: '客户端错误' },
  { value: '5xx', label: '服务端错误' },
]

function formatDate(d: string) {
  try { return format(new Date(d), "HH:mm:ss.SSS") } catch { return d }
}
function formatFullDate(d: string) {
  try { return format(new Date(d), "yyyy-MM-dd HH:mm:ss.SSS") } catch { return d }
}

export function LogsTab() {
  const { activeTenant, projectId } = useTenantProject()
  const selectedId = useApiEditorStore(s => s.selectedId)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [keyword, setKeyword] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)

  const query: CallLogQuery = {
    page: 1, size: 50,
    status: statusFilter === 'all' ? '' : statusFilter,
    keyword: keyword.trim() || undefined,
  }

  const { logs, isLoading, refetch, isFetching } = useEndpointCallLogs(
    activeTenant, Number(projectId), selectedId ?? 0, query, autoRefresh,
  )

  if (!selectedId) return null

  return (
    <div className="p-6 max-w-5xl">
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-bold text-zinc-700 shrink-0">调用日志</h3>

        {/* Status filter pills */}
        <div className="inline-flex bg-zinc-100/80 rounded-lg p-0.5 border border-border-subtle">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "text-2xs font-bold px-3 py-1 rounded-md transition-colors",
                statusFilter === f.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-zinc-700",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Keyword search */}
        <Input
          placeholder="搜索路径 / 错误信息..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          className="h-8 text-xs max-w-[240px]"
        />

        <div className="ml-auto flex items-center gap-2">
          <label className="text-2xs text-muted-foreground inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="accent-primary"
            />
            自动刷新 (30s)
          </label>
          <Button
            size="sm"
            variant="ghost"
            disabled={isFetching}
            onClick={() => refetch()}
            className="h-8 text-xs px-2.5 gap-1.5 text-muted-foreground"
          >
            <RotateCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">加载中...</div>
      ) : logs.length === 0 ? (
        <LogsEmptyState />
      ) : (
        <div className="border border-border-subtle rounded-xl overflow-hidden bg-white">
          {/* Header row */}
          <div className="grid grid-cols-[80px_120px_60px_1fr_80px] gap-3 px-4 py-2.5 bg-zinc-50/80 border-b border-border-subtle text-2xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>状态</span>
            <span>时间</span>
            <span>方法</span>
            <span>路径 / 错误概要</span>
            <span className="text-right">耗时</span>
          </div>
          <ul className="divide-y divide-border-subtle">
            {logs.map(log => <LogRow key={log.id} log={log} />)}
          </ul>
        </div>
      )}
    </div>
  )
}

function LogRow({ log }: { log: EndpointCallLog }) {
  const [expanded, setExpanded] = useState(false)
  const tone = log.status >= 500 ? "red" : log.status >= 400 ? "amber" : "emerald"
  const Icon = tone === "red" ? AlertCircle : tone === "amber" ? AlertTriangle : CheckCircle2
  const toneCls = {
    red: "text-red-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  }[tone]

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full grid grid-cols-[80px_120px_60px_1fr_80px] gap-3 px-4 py-2.5 hover:bg-zinc-50/60 text-left items-center"
      >
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-mono font-bold", toneCls)}>
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {log.status}
        </span>
        <span className="text-xs font-mono text-muted-foreground">{formatDate(log.at)}</span>
        <span className="text-2xs font-black uppercase text-zinc-600">{log.method}</span>
        <span className="text-xs text-zinc-700 truncate">
          <span className="font-mono">{log.path}</span>
          {log.error && <span className="text-red-600 ml-2">· {log.error}</span>}
        </span>
        <span className="text-xs text-muted-foreground font-mono text-right inline-flex items-center justify-end gap-1.5">
          {log.latency_ms}ms
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-zinc-50/40 border-t border-border-subtle space-y-3">
          <DetailRow label="完整时间" value={formatFullDate(log.at)} mono />
          {log.version ? <DetailRow label="调用版本" value={`v${log.version}`} mono /> : null}
          <DetailRow label="调用方 IP" value={log.ip || "—"} mono />
          <DetailRow label="User-Agent" value={log.user_agent || "—"} mono />
          {log.params && Object.keys(log.params).length > 0 && (
            <div>
              <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">请求参数</p>
              <pre className="text-xs text-zinc-700 bg-white border border-border-subtle rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed font-mono">
                {JSON.stringify(log.params, null, 2)}
              </pre>
            </div>
          )}
          {log.error && (
            <div>
              <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">错误详情</p>
              <pre className="text-xs text-red-700 bg-red-50/40 border border-red-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed font-mono">
                {log.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 text-xs">
      <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={cn("text-zinc-700 truncate", mono && "font-mono")}>{value}</span>
    </div>
  )
}

function LogsEmptyState() {
  return (
    <div className="border border-dashed border-border rounded-xl py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4 border border-border-subtle">
        <ScrollText className="w-6 h-6 text-zinc-300" />
      </div>
      <p className="text-sm font-bold text-zinc-700">还没有调用记录</p>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
        接口被外部实际调用后（路径形如 <code className="font-mono text-zinc-700">/{`{租户}`}/{`{项目}`}/...</code>），每一次请求都会留下一条流水。
      </p>
    </div>
  )
}
