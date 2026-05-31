"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { LayoutList, Lock, Globe, KeyRound } from "lucide-react"
type AuthType = "public" | "api_key" | "jwt"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useParamSync } from "../_hooks/useParamSync"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useReferenceData } from "../_hooks/useReferenceData"
import { useProject, useEnvironments } from "@/hooks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMemo, useState } from "react"
import { envColor } from "../../_utils/envColor"
import { cn as cnUtil } from "@/lib/utils"
import type { ParamDef, ResponseDef } from "../_types"

// ── Response schema helpers ───────────────────────────────────────────────────

function tryRunSchemaFn(code: string): Record<string, unknown> | null {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${code}\nreturn typeof schema === 'function' ? schema() : null;`)
    const result = fn()
    return result && typeof result === 'object' ? result as Record<string, unknown> : null
  } catch {
    return null
  }
}

// Convert type strings ("integer", "string", …) to sample values recursively.
function typeToSampleValue(v: unknown): unknown {
  if (v === 'integer') return 0
  if (v === 'number') return 0.0
  if (v === 'boolean') return false
  if (v === 'string') return ''
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      result[k] = typeToSampleValue(val)
    }
    return result
  }
  return v
}

function buildResponseExample(
  schema: Record<string, unknown>,
  fields: ResponseDef[],
): Record<string, unknown> {
  // First convert all type strings to sample values so the preview looks like a real response.
  const example = typeToSampleValue(schema) as Record<string, unknown>
  if (fields.length === 0) return example

  const exampleRow: Record<string, unknown> = {}
  for (const f of fields) {
    exampleRow[f.name] = f.type === 'integer' ? 0
      : f.type === 'number' ? 0.0
      : f.type === 'boolean' ? false
      : ''
  }

  const data = example.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.list)) {
      // list response: substitute actual SQL columns into data.list
      d.list = [exampleRow]
    } else if (Object.keys(d).length === 0) {
      // detail response: data is {} — substitute SQL columns in
      example.data = exampleRow
    }
  }
  return example
}

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGINATION_PARAMS = [
  { name: "is_pager", type: "integer", default: "1",  desc: "是否分页：1 开启 / 0 返回全量" },
  { name: "page",     type: "integer", default: "1",  desc: "页码，从 1 开始" },
  { name: "size",     type: "integer", default: "10", desc: "每页条数" },
]

const PAGINATION_PARAM_NAMES = new Set(["is_pager", "page", "size", "limit", "offset"])

function hasPaginationLogic(code: string) {
  return code.includes("is_pager") || (code.includes("limit") && code.includes("offset"))
}

// ── Path param helpers ────────────────────────────────────────────────────────

function extractPathParamNames(path: string): Set<string> {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? []
  return new Set(matches.map(m => m.slice(1)))
}

// ── cURL builder ──────────────────────────────────────────────────────────────

function buildCurl(
  method: string,
  path: string,
  envName: string,
  tenantSlug: string,
  projectSlug: string,
  baseUrl: string,
  paramDefs: ParamDef[],
  paginationEnabled: boolean,
  authType: AuthType,
): string {
  const pathParamNames = extractPathParamNames(path)

  let resolvedPath = path
  for (const def of paramDefs) {
    if (pathParamNames.has(def.name)) {
      resolvedPath = resolvedPath.replace(
        `:${def.name}`,
        encodeURIComponent(def.default || String(def.name)),
      )
    }
  }

  // Gateway URL: /-/:env/:tenant/:project/*path
  const url = `${baseUrl}/-/${envName}/${tenantSlug}/${projectSlug}${resolvedPath}`
  const isQueryMethod = method === "GET" || method === "DELETE"

  const businessEntries = paramDefs
    .filter(d => !pathParamNames.has(d.name))
    .map(d => [d.name, d.default || "value"] as [string, string])
  const paginationEntries: [string, string][] = paginationEnabled
    ? [["is_pager", "1"], ["page", "1"], ["size", "10"]]
    : []
  const allEntries = [...businessEntries, ...paginationEntries]

  const authHeader = authType === "api_key"
    ? `  -H "Authorization: Bearer <your-api-key>" \\\n`
    : authType === "jwt"
    ? `  -H "Authorization: Bearer <your-jwt-token>" \\\n`
    : ""

  if (isQueryMethod) {
    const qs = allEntries.length
      ? "?" + allEntries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
      : ""
    if (authHeader) {
      return (
        `curl -X ${method} "${url}${qs}" \\\n` +
        authHeader.replace(/ \\\n$/, "")
      )
    }
    return `curl -X ${method} "${url}${qs}"`
  }

  const body = JSON.stringify(Object.fromEntries(allEntries), null, 2)
  return (
    `curl -X ${method} "${url}" \\\n` +
    authHeader +
    `  -H "Content-Type: application/json" \\\n` +
    `  -d '${body}'`
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocTab() {
  const { projectId, activeTenant } = useTenantProject()
  const { data: project } = useProject(activeTenant, Number(projectId))
  const { data: envs = [] } = useEnvironments(activeTenant, Number(projectId))
  const defaultEnvName = useMemo(() => envs.find(e => e.is_default)?.name ?? envs[0]?.name ?? 'prod', [envs])
  const [selectedEnvName, setSelectedEnvName] = useState<string>('')
  const exampleEnvName = selectedEnvName || defaultEnvName

  const formMethod    = useEndpointFormStore(s => s.form.method)
  const paramDefs     = useEndpointFormStore(s => s.form.paramDefs)
  const responseDefs  = useEndpointFormStore(s => s.form.responseDefs)
  const preScripts    = useEndpointFormStore(s => s.form.preScripts)
  const postScripts   = useEndpointFormStore(s => s.form.postScripts)
  useParamSync()
  const { scripts } = useReferenceData(activeTenant)

  // 解析一步脚本的代码：内联用自身 code，库引用按 id 取 code。
  const stepCode = (s: { source: string; scriptId?: number; code?: string }) =>
    s.source === "inline" ? (s.code ?? "") : (scripts.find(x => x.id === s.scriptId)?.code ?? "")

  // 响应 schema 取自后置链最后一段（产生最终响应结构的那一步）。
  const lastPost = postScripts.length > 0 ? postScripts[postScripts.length - 1] : null
  const lastPostName = lastPost
    ? (lastPost.source === "inline" ? (lastPost.name || "内联脚本") : (scripts.find(x => x.id === lastPost.scriptId)?.name ?? ""))
    : ""
  const lastPostCode = lastPost ? stepCode(lastPost) : ""
  const schemaObj = useMemo(
    () => (lastPostCode ? tryRunSchemaFn(lastPostCode) : null),
    [lastPostCode],
  )
  const responseExample = useMemo(
    () => (schemaObj ? buildResponseExample(schemaObj, responseDefs) : null),
    [schemaObj, responseDefs],
  )

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== "undefined" ? window.location.origin : "")
  const isQueryMethod = formMethod === "GET" || formMethod === "DELETE"

  // 分页若由前置链中任意一段提供即视为启用
  const paginationEnabled = preScripts.some(s => hasPaginationLogic(stepCode(s)))

  const formPath    = useEndpointFormStore(s => s.form.path)
  const formSummary = useEndpointFormStore(s => s.form.summary)
  const pathParamNames = extractPathParamNames(formPath)
  const projectSlug = project?.slug ?? projectId
  const authType: AuthType = (project?.auth_type as AuthType) ?? "public"
  const curl = buildCurl(formMethod, formPath, exampleEnvName, activeTenant, projectSlug, baseUrl, paramDefs, paginationEnabled, authType)

  // Split params into three groups
  const businessParams = paramDefs.filter(d => !paginationEnabled || !PAGINATION_PARAM_NAMES.has(d.name))
  const pathParams     = businessParams.filter(d => pathParamNames.has(d.name))
  const nonPathParams  = businessParams.filter(d => !pathParamNames.has(d.name))
  const hasAnyParam    = pathParams.length > 0 || nonPathParams.length > 0 || paginationEnabled

  return (
    <div className="p-0 animate-in fade-in duration-300">
      <div className="flex-1 overflow-auto p-10 custom-scrollbar bg-white">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Endpoint identity */}
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">
              {formSummary || <span className="text-zinc-300 font-normal italic">未命名接口</span>}
            </h2>
            <div className="flex items-center gap-2.5">
              <span className={cn(
                "text-2xs font-black px-2 py-0.5 rounded-md border uppercase tracking-wider",
                formMethod === "GET"    ? "bg-primary/10 text-primary border-primary/30"
                : formMethod === "POST"   ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : formMethod === "PUT"    ? "bg-amber-50 text-amber-600 border-amber-200"
                : formMethod === "DELETE" ? "bg-red-50 text-red-600 border-red-200"
                : "bg-zinc-50 text-muted-foreground border-border"
              )}>
                {formMethod}
              </span>
              <span className="text-sm font-mono text-muted-foreground">{formPath || "-"}</span>
            </div>
          </div>

          {/* 鉴权 */}
          <div className="space-y-3">
            <SectionTitle color="blue">鉴权</SectionTitle>
            <AuthSection authType={authType} />
          </div>

          {/* 请求参数 */}
          <div className="space-y-5">
            <SectionTitle color="blue">请求参数</SectionTitle>

            {!hasAnyParam && <EmptyParams />}

            {/* 1. 路径参数 */}
            {pathParams.length > 0 && (
              <ParamGroup
                label="路径参数"
                tag="Path"
                tagColor="green"
                desc="嵌入 URL 路径中，如 /api/users/1"
              >
                {pathParams.map(def => (
                  <ParamRow key={def.name}>
                    <td className="px-5 py-3 font-mono font-bold text-emerald-600 text-sm truncate">{def.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{def.type || "string"}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm">
                      {def.required ? <span className="text-red-500 font-bold">是</span> : <span className="text-muted-foreground">否</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-muted-foreground truncate">{def.default || "-"}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground truncate">{def.desc || "-"}</td>
                  </ParamRow>
                ))}
              </ParamGroup>
            )}

            {/* 2. Query 参数 (GET / DELETE)，含分页 */}
            {isQueryMethod && (nonPathParams.length > 0 || paginationEnabled) && (
              <ParamGroup
                label="Query 参数"
                tag="Query"
                tagColor="blue"
                desc="追加在 URL 后，如 ?key=value"
              >
                {nonPathParams.map(def => (
                  <ParamRow key={def.name}>
                    <td className="px-5 py-3 font-mono font-bold text-primary text-sm truncate">{def.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{def.type || "string"}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm">
                      {def.required ? <span className="text-red-500 font-bold">是</span> : <span className="text-muted-foreground">否</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-muted-foreground truncate">{def.default || "-"}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground truncate">{def.desc || "-"}</td>
                  </ParamRow>
                ))}
                {paginationEnabled && <PaginationDivider show={true} />}
                {paginationEnabled && PAGINATION_PARAMS.map(p => (
                  <ParamRow key={p.name}>
                    <td className="px-5 py-3 font-mono font-bold text-violet-500 text-sm truncate">{p.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{p.type}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm"><span className="text-muted-foreground">否</span></td>
                    <td className="px-5 py-3 text-sm font-mono text-muted-foreground truncate">{p.default}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground truncate">{p.desc}</td>
                  </ParamRow>
                ))}
              </ParamGroup>
            )}

            {/* 3. Body 参数 (POST / PUT)，含分页 */}
            {!isQueryMethod && (nonPathParams.length > 0 || paginationEnabled) && (
              <ParamGroup
                label="Body 参数"
                tag="Body"
                tagColor="amber"
                desc="以 JSON 格式放在请求体中"
              >
                {nonPathParams.map(def => (
                  <ParamRow key={def.name}>
                    <td className="px-5 py-3 font-mono font-bold text-amber-600 text-sm truncate">{def.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{def.type || "string"}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm">
                      {def.required ? <span className="text-red-500 font-bold">是</span> : <span className="text-muted-foreground">否</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-muted-foreground truncate">{def.default || "-"}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground truncate">{def.desc || "-"}</td>
                  </ParamRow>
                ))}
                {paginationEnabled && <PaginationDivider show={true} />}
                {paginationEnabled && PAGINATION_PARAMS.map(p => (
                  <ParamRow key={p.name}>
                    <td className="px-5 py-3 font-mono font-bold text-violet-500 text-sm truncate">{p.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{p.type}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm"><span className="text-muted-foreground">否</span></td>
                    <td className="px-5 py-3 text-sm font-mono text-muted-foreground truncate">{p.default}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground truncate">{p.desc}</td>
                  </ParamRow>
                ))}
              </ParamGroup>
            )}
          </div>

          {/* 响应结构 */}
          <div className="space-y-5">
            <SectionTitle color="blue">响应结构</SectionTitle>

            {/* Full response JSON preview — built from post script schema() */}
            {responseExample && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-zinc-700">完整响应示例</span>
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-md border bg-emerald-50 text-emerald-600 border-emerald-200">JSON</span>
                  {lastPostName && (
                    <span className="text-xs text-muted-foreground">
                      由后置脚本「{lastPostName}」定义
                    </span>
                  )}
                </div>
                <div className="bg-zinc-900 rounded-xl p-4 font-mono text-xs leading-relaxed overflow-auto max-h-80 border border-zinc-800">
                  <pre className="text-emerald-400 whitespace-pre">{JSON.stringify(responseExample, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Data field table */}
            {responseDefs.length === 0 ? (
              <div className="p-5 bg-zinc-50/50 rounded-xl border border-dashed border-border text-sm text-muted-foreground text-center italic">
                暂未定义响应字段 — 在 SQL 设计器执行后点击「提取响应字段」
              </div>
            ) : (
              <ResponseGroup defs={responseDefs} />
            )}
          </div>

          {/* cURL example */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle color="blue">调用示例</SectionTitle>
              {envs.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-muted-foreground">环境</span>
                  <Select value={exampleEnvName} onValueChange={setSelectedEnvName}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {envs.map(e => (
                        <SelectItem key={e.id} value={e.name}>
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cnUtil("w-1.5 h-1.5 rounded-full", envColor(e.name).bg)} />
                            <span className="font-bold">{e.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="bg-zinc-900 rounded-xl p-5 font-mono text-sm leading-relaxed text-emerald-400 shadow-card border border-zinc-800 overflow-x-auto">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">cURL</span>
                <Badge variant="outline" className="text-2xs text-muted-foreground border-zinc-700 rounded-md">Bash</Badge>
              </div>
              <pre className="whitespace-pre-wrap break-all">{curl}</pre>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResponseGroup({ defs }: { defs: ResponseDef[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-3.5 rounded-full bg-violet-500" />
        <span className="text-xs font-bold text-zinc-700">响应字段</span>
        <span className="text-2xs font-bold px-1.5 py-0.5 rounded-md border bg-violet-50 text-violet-600 border-violet-200">
          Response
        </span>
        <span className="text-xs text-muted-foreground">接口 data 对象包含的字段</span>
      </div>
      <div className="bg-white rounded-xl overflow-hidden border border-border/80 shadow-card">
        <table className="w-full text-left table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col />
          </colgroup>
          <thead className="bg-zinc-50/80 border-b border-border/50">
            <tr>
              {["字段名", "类型", "说明"].map(h => (
                <th key={h} className="px-5 py-3 text-2xs font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {defs.map(def => (
              <tr key={def.name} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-5 py-3 font-mono font-bold text-violet-600 text-sm truncate">{def.name}</td>
                <td className="px-5 py-3"><TypeBadge>{def.type || "string"}</TypeBadge></td>
                <td className="px-5 py-3 text-sm text-muted-foreground truncate">{def.desc || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type TagColor = "green" | "blue" | "amber" | "violet"

const tagColorMap: Record<TagColor, { badge: string; bar: string }> = {
  green:  { badge: "bg-emerald-50 text-emerald-600 border-emerald-200", bar: "bg-emerald-500" },
  blue:   { badge: "bg-primary/10 text-primary border-primary/30",          bar: "bg-primary/80" },
  amber:  { badge: "bg-amber-50 text-amber-600 border-amber-200",       bar: "bg-amber-500" },
  violet: { badge: "bg-violet-50 text-violet-600 border-violet-200",    bar: "bg-violet-500" },
}

function ParamGroup({
  label,
  tag,
  tagColor,
  desc,
  icon,
  children,
}: {
  label: string
  tag: string
  tagColor: TagColor
  desc: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const colors = tagColorMap[tagColor]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={cn("w-1 h-3.5 rounded-full", colors.bar)} />
        <span className="text-xs font-bold text-zinc-700">{label}</span>
        <span className={cn("text-2xs font-bold px-1.5 py-0.5 rounded-md border", colors.badge)}>
          {tag}
        </span>
        {icon && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-violet-50 border border-violet-100 rounded-full">
            {icon}
            <span className="text-2xs font-bold text-violet-600">前置脚本注入</span>
          </div>
        )}
        <span className="text-xs text-muted-foreground">{desc}</span>
      </div>
      <div className="bg-white rounded-xl overflow-hidden border border-border/80 shadow-card">
        <table className="w-full text-left table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[15%]" />
            <col />
          </colgroup>
          <thead className="bg-zinc-50/80 border-b border-border/50">
            <tr>
              {["参数名", "类型", "必填", "默认值", "说明"].map(h => (
                <th key={h} className="px-5 py-3 text-2xs font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: "blue" | "violet" }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-1 h-5 rounded-full", color === "violet" ? "bg-violet-500" : "bg-primary")} />
      <h4 className="text-lg font-bold text-foreground">{children}</h4>
    </div>
  )
}

function ParamRow({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-zinc-50/50 transition-colors">{children}</tr>
}

function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-2xs font-bold px-2 py-0.5 bg-zinc-100 text-muted-foreground rounded-md uppercase">
      {children}
    </span>
  )
}

function PaginationDivider({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <tr>
      <td colSpan={5} className="px-5 py-1.5 bg-violet-50/60 border-y border-violet-100/80">
        <span className="flex items-center gap-1 text-2xs font-bold text-violet-500">
          <LayoutList className="w-3 h-3" />
          分页参数 · 前置脚本注入
        </span>
      </td>
    </tr>
  )
}

function AuthSection({ authType }: { authType: AuthType }) {
  if (authType === "public") {
    return (
      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
        <Globe className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-emerald-700">公开访问</p>
          <p className="text-xs text-emerald-600">此接口无需鉴权，可直接调用。</p>
        </div>
      </div>
    )
  }

  if (authType === "api_key") {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <KeyRound className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-2">
          <p className="text-sm font-bold text-amber-700">API Key 鉴权</p>
          <p className="text-xs text-amber-600">在请求头中携带项目颁发的 API Key：</p>
          <code className="block text-xs font-mono bg-amber-100/70 text-amber-800 px-3 py-1.5 rounded-lg">
            Authorization: Bearer &lt;your-api-key&gt;
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-100 rounded-xl">
      <Lock className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
      <div className="space-y-2">
        <p className="text-sm font-bold text-violet-700">JWT 鉴权</p>
        <p className="text-xs text-violet-600">在请求头中携带使用项目 JWT 密钥签发的 Token：</p>
        <code className="block text-xs font-mono bg-violet-100/70 text-violet-800 px-3 py-1.5 rounded-lg">
          Authorization: Bearer &lt;your-jwt-token&gt;
        </code>
        <p className="text-xs text-violet-500">签发算法：HMAC-SHA256（HS256），有效期由 exp 字段控制。</p>
      </div>
    </div>
  )
}

function EmptyParams() {
  return (
    <div className="p-5 bg-zinc-50/50 rounded-xl border border-dashed border-border text-sm text-muted-foreground text-center italic">
      该接口无请求参数，可直接调用。
    </div>
  )
}
