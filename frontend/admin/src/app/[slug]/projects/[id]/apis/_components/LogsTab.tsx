"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { ScrollText, RotateCw, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, AlertTriangle, Copy, Check, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useEnvironments } from "@/hooks"
import { useEndpointCallLogs } from "@/hooks/useEndpointCallLogs"
import { envColor } from "../../_utils/envColor"
import { useGetProject } from "@/lib/sdk"
import type { EndpointCallLogResp as EndpointCallLog, ListEndpointCallLogsParams as CallLogQuery } from "@/lib/sdk"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

function resolveLogPath(path: string, pathParams?: Record<string, string>): string {
  if (!pathParams) return path
  return Object.entries(pathParams).reduce(
    (p, [k, v]) => p.replace(`:${k}`, encodeURIComponent(v)),
    path,
  )
}

function buildCurlFromLog(
  log: EndpointCallLog,
  tenantSlug: string,
  projectSlug: string,
): string {
  const envName = log.env_name ?? ""
  const resolvedPath = resolveLogPath(log.path, log.path_params)
  const url = `${API_BASE}/-/${envName}/${tenantSlug}/${projectSlug}${resolvedPath}`
  const isGetLike = log.method === "GET" || log.method === "DELETE"

  const qs = isGetLike && log.query_params && Object.keys(log.query_params).length > 0
    ? "?" + Object.entries(log.query_params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
    : ""

  const lines: string[] = []
  lines.push(log.method === "GET" ? `curl \\` : `curl -X ${log.method} \\`)
  lines.push(`  "${url}${qs}" \\`)

  const sortedHeaders = Object.entries(log.headers ?? {}).sort(([a], [b]) => a.localeCompare(b))
  for (const [k, v] of sortedHeaders) {
    lines.push(`  -H "${k}: ${v}" \\`)
  }
  lines.push(`  -H "Authorization: Bearer <your-token>" \\`)

  if (!isGetLike && log.body_params && Object.keys(log.body_params).length > 0) {
    lines.push(`  -d '${JSON.stringify(log.body_params)}'`)
  } else {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, "")
  }

  return lines.join("\n")
}

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
  const { data: envs = [] } = useEnvironments(activeTenant, Number(projectId))
  const selectedId = useApiEditorStore(s => s.selectedId)

  const { data: project } = useGetProject(activeTenant, Number(projectId), {
    query: { enabled: !!activeTenant && !!projectId, staleTime: 60_000 },
  })
  const projectSlug = project?.slug ?? ""

  const activeTab = useApiEditorStore(s => s.activeTab)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [keyword, setKeyword] = useState("")
  const [debouncedKeyword, setDebouncedKeyword] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [envFilter, setEnvFilter] = useState<number>(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 300)
    return () => clearTimeout(t)
  }, [keyword])

  const query: CallLogQuery = useMemo(() => ({
    page: 1, size: 50,
    status: statusFilter === 'all' ? '' : statusFilter,
    keyword: debouncedKeyword.trim() || undefined,
    env_id: envFilter || undefined,
  }), [statusFilter, debouncedKeyword, envFilter])

  const { logs, isLoading, refetch, isFetching } = useEndpointCallLogs(
    activeTenant, Number(projectId), selectedId ?? 0, query, autoRefresh,
  )

  useEffect(() => {
    if (activeTab === "logs" && selectedId) refetch()
  }, [activeTab, selectedId, refetch])

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

        {/* Env filter pills */}
        {envs.length > 0 && (
          <div className="inline-flex bg-zinc-100/80 rounded-lg p-0.5 border border-border-subtle">
            <button
              onClick={() => setEnvFilter(0)}
              className={cn(
                "text-2xs font-bold px-3 py-1 rounded-md transition-colors",
                envFilter === 0 ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-zinc-700",
              )}
            >
              全部 env
            </button>
            {envs.map(env => (
              <button
                key={env.id}
                onClick={() => setEnvFilter(env.id)}
                className={cn(
                  "text-2xs font-bold px-3 py-1 rounded-md transition-colors inline-flex items-center gap-1.5",
                  envFilter === env.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-zinc-700",
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", envColor(env.name).bg)} />
                {env.name}
              </button>
            ))}
          </div>
        )}

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
          <div className="grid grid-cols-[80px_110px_80px_60px_1fr_100px_80px] gap-3 px-4 py-2.5 bg-zinc-50/80 border-b border-border-subtle text-2xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>状态</span>
            <span>时间</span>
            <span>环境</span>
            <span>方法</span>
            <span>路径 / 错误概要</span>
            <span>IP</span>
            <span className="text-right">耗时</span>
          </div>
          <ul className="divide-y divide-border-subtle">
            {logs.map(log => <LogRow key={log.id} log={log} tenantSlug={activeTenant} projectSlug={projectSlug} />)}
          </ul>
        </div>
      )}
    </div>
  )
}

function LogRow({ log, tenantSlug, projectSlug }: { log: EndpointCallLog; tenantSlug: string; projectSlug: string }) {
  const [expanded, setExpanded] = useState(false)
  const [showCurl, setShowCurl] = useState(false)
  const [copied, setCopied] = useState(false)

  const curlCommand = useMemo(
    () => showCurl ? buildCurlFromLog(log, tenantSlug, projectSlug) : "",
    [showCurl, log, tenantSlug, projectSlug],
  )

  function copyCurl() {
    navigator.clipboard.writeText(curlCommand || buildCurlFromLog(log, tenantSlug, projectSlug))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
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
        className="w-full grid grid-cols-[80px_110px_80px_60px_1fr_100px_80px] gap-3 px-4 py-2.5 hover:bg-zinc-50/60 text-left items-center"
      >
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-mono font-bold", toneCls)}>
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {log.status}
        </span>
        <span className="text-xs font-mono text-muted-foreground">{formatDate(log.at)}</span>
        <span className="inline-flex items-center gap-1 text-2xs font-bold text-muted-foreground truncate">
          {log.env_name ? (
            <>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", envColor(log.env_name).bg)} />
              {log.env_name}
            </>
          ) : "—"}
        </span>
        <span className="text-2xs font-black uppercase text-zinc-600">{log.method}</span>
        <span className="text-xs text-zinc-700 truncate">
          <span className="font-mono">{log.path}</span>
          {log.error && <span className="text-red-600 ml-2">· {log.error}</span>}
        </span>
        <span className="text-xs font-mono text-muted-foreground truncate">{log.ip || "—"}</span>
        <span className="text-xs text-muted-foreground font-mono text-right inline-flex items-center justify-end gap-1.5">
          {log.latency_ms}ms
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-zinc-50/40 border-t border-border-subtle space-y-3">
          <DetailRow label="开始时间" value={formatFullDate(log.at)} mono />
          <DetailRow label="结束时间" value={formatFullDate(new Date(new Date(log.at).getTime() + log.latency_ms).toISOString())} mono />
          <DetailRow label="耗时" value={`${log.latency_ms} ms`} mono />
          {log.version ? <DetailRow label="调用版本" value={`v${log.version}`} mono /> : null}

          {log.path_params && Object.keys(log.path_params).length > 0 && (
            <ParamBlock label="Path 参数" params={log.path_params} />
          )}
          {log.query_params && Object.keys(log.query_params).length > 0 && (
            <ParamBlock label="Query 参数" params={log.query_params} />
          )}
          {log.body_params && Object.keys(log.body_params).length > 0 && (
            <ParamBlock label="Body 参数" params={log.body_params} />
          )}
          {log.headers && Object.keys(log.headers).length > 0 && (
            <div>
              <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">请求 Headers</p>
              <div className="bg-white border border-border-subtle rounded-lg p-3 space-y-0.5">
                {Object.entries(log.headers).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => (
                  <div key={k} className="text-xs font-mono leading-relaxed grid grid-cols-[auto_1fr] gap-x-2">
                    <span className="text-blue-600 font-semibold shrink-0">{k}:</span>
                    <span className="text-zinc-700 break-all">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* cURL 还原 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <button
                type="button"
                onClick={() => setShowCurl(v => !v)}
                className="text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Terminal className="w-3 h-3" />
                还原 cURL
                {showCurl ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {showCurl && (
                <button
                  type="button"
                  onClick={copyCurl}
                  className="text-2xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied
                    ? <><Check className="w-3 h-3 text-emerald-500" /><span>已复制</span></>
                    : <><Copy className="w-3 h-3" /><span>复制</span></>}
                </button>
              )}
            </div>
            {showCurl && (
              <pre className="text-xs text-zinc-700 bg-zinc-900 text-zinc-100 rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed font-mono">
                {curlCommand}
              </pre>
            )}
          </div>

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

function ParamBlock({ label, params }: { label: string; params: Record<string, string> }) {
  return (
    <div>
      <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <div className="bg-white border border-border-subtle rounded-lg p-3 space-y-0.5">
        {Object.entries(params).map(([k, v]) => (
          <div key={k} className="text-xs font-mono leading-relaxed grid grid-cols-[auto_1fr] gap-x-2">
            <span className="text-violet-600 font-semibold shrink-0">{k}:</span>
            <span className="text-zinc-700 break-all">{v}</span>
          </div>
        ))}
      </div>
    </div>
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
        通过「运行」Tab 发送请求，或外部调用网关路径后，每一次请求都会留下一条流水。
      </p>
    </div>
  )
}
