"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { LayoutList } from "lucide-react"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useParamSync } from "../_hooks/useParamSync"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useReferenceData } from "../_hooks/useReferenceData"
import { useProject } from "@/hooks"
import type { ParamDef } from "../_types"

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
  tenantSlug: string,
  projectSlug: string,
  baseUrl: string,
  paramDefs: ParamDef[],
  paginationEnabled: boolean,
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

  const url = `${baseUrl}/${tenantSlug}/${projectSlug}${resolvedPath}`
  const isQueryMethod = method === "GET" || method === "DELETE"

  const businessEntries = paramDefs
    .filter(d => !pathParamNames.has(d.name))
    .map(d => [d.name, d.default || "value"] as [string, string])
  const paginationEntries: [string, string][] = paginationEnabled
    ? [["is_pager", "1"], ["page", "1"], ["size", "10"]]
    : []
  const allEntries = [...businessEntries, ...paginationEntries]

  if (isQueryMethod) {
    const qs = allEntries.length
      ? "?" + allEntries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
      : ""
    return `curl -X ${method} "${url}${qs}"`
  }

  const body = JSON.stringify(Object.fromEntries(allEntries), null, 2)
  return (
    `curl -X ${method} "${url}" \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -d '${body}'`
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocTab() {
  const { projectId, activeTenant } = useTenantProject()
  const { data: project } = useProject(activeTenant, Number(projectId))
  const formMethod   = useEndpointFormStore(s => s.form.method)
  const paramDefs    = useEndpointFormStore(s => s.form.paramDefs)
  const preScriptId  = useEndpointFormStore(s => s.form.preScriptId)
  useParamSync()
  const { scripts } = useReferenceData(activeTenant)

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== "undefined" ? window.location.origin : "")
  const isQueryMethod = formMethod === "GET" || formMethod === "DELETE"

  const preScript = scripts.find(s => s.id === preScriptId)
  const paginationEnabled = !!preScript && hasPaginationLogic(preScript.code)

  const formPath    = useEndpointFormStore(s => s.form.path)
  const formSummary = useEndpointFormStore(s => s.form.summary)
  const pathParamNames = extractPathParamNames(formPath)
  const projectSlug = project?.slug ?? projectId
  const curl = buildCurl(formMethod, formPath, activeTenant, projectSlug, baseUrl, paramDefs, paginationEnabled)

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
            <h2 className="text-xl font-bold text-zinc-900">
              {formSummary || <span className="text-zinc-300 font-normal italic">未命名接口</span>}
            </h2>
            <div className="flex items-center gap-2.5">
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider",
                formMethod === "GET"    ? "bg-blue-50 text-blue-600 border-blue-200"
                : formMethod === "POST"   ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : formMethod === "PUT"    ? "bg-amber-50 text-amber-600 border-amber-200"
                : formMethod === "DELETE" ? "bg-red-50 text-red-600 border-red-200"
                : "bg-zinc-50 text-zinc-500 border-zinc-200"
              )}>
                {formMethod}
              </span>
              <span className="text-sm font-mono text-zinc-500">{formPath || "-"}</span>
            </div>
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
                      {def.required ? <span className="text-red-500 font-bold">是</span> : <span className="text-zinc-400">否</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-zinc-500 truncate">{def.default || "-"}</td>
                    <td className="px-5 py-3 text-sm text-zinc-500 truncate">{def.desc || "-"}</td>
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
                    <td className="px-5 py-3 font-mono font-bold text-blue-600 text-sm truncate">{def.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{def.type || "string"}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm">
                      {def.required ? <span className="text-red-500 font-bold">是</span> : <span className="text-zinc-400">否</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-zinc-500 truncate">{def.default || "-"}</td>
                    <td className="px-5 py-3 text-sm text-zinc-500 truncate">{def.desc || "-"}</td>
                  </ParamRow>
                ))}
                {paginationEnabled && <PaginationDivider show={true} />}
                {paginationEnabled && PAGINATION_PARAMS.map(p => (
                  <ParamRow key={p.name}>
                    <td className="px-5 py-3 font-mono font-bold text-violet-500 text-sm truncate">{p.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{p.type}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm"><span className="text-zinc-400">否</span></td>
                    <td className="px-5 py-3 text-sm font-mono text-zinc-500 truncate">{p.default}</td>
                    <td className="px-5 py-3 text-sm text-zinc-500 truncate">{p.desc}</td>
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
                      {def.required ? <span className="text-red-500 font-bold">是</span> : <span className="text-zinc-400">否</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-zinc-500 truncate">{def.default || "-"}</td>
                    <td className="px-5 py-3 text-sm text-zinc-500 truncate">{def.desc || "-"}</td>
                  </ParamRow>
                ))}
                {paginationEnabled && <PaginationDivider show={true} />}
                {paginationEnabled && PAGINATION_PARAMS.map(p => (
                  <ParamRow key={p.name}>
                    <td className="px-5 py-3 font-mono font-bold text-violet-500 text-sm truncate">{p.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{p.type}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm"><span className="text-zinc-400">否</span></td>
                    <td className="px-5 py-3 text-sm font-mono text-zinc-500 truncate">{p.default}</td>
                    <td className="px-5 py-3 text-sm text-zinc-500 truncate">{p.desc}</td>
                  </ParamRow>
                ))}
              </ParamGroup>
            )}
          </div>

          {/* cURL example */}
          <div className="space-y-4">
            <SectionTitle color="blue">调用示例</SectionTitle>
            <div className="bg-zinc-900 rounded-xl p-5 font-mono text-sm leading-relaxed text-emerald-400 shadow-lg border border-zinc-800 overflow-x-auto">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">cURL</span>
                <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700 rounded-md">Bash</Badge>
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

type TagColor = "green" | "blue" | "amber" | "violet"

const tagColorMap: Record<TagColor, { badge: string; bar: string }> = {
  green:  { badge: "bg-emerald-50 text-emerald-600 border-emerald-200", bar: "bg-emerald-500" },
  blue:   { badge: "bg-blue-50 text-blue-600 border-blue-200",          bar: "bg-blue-500" },
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
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border", colors.badge)}>
          {tag}
        </span>
        {icon && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-violet-50 border border-violet-100 rounded-full">
            {icon}
            <span className="text-[10px] font-bold text-violet-600">前置脚本注入</span>
          </div>
        )}
        <span className="text-[11px] text-zinc-400">{desc}</span>
      </div>
      <div className="bg-white rounded-xl overflow-hidden border border-zinc-200/80 shadow-sm">
        <table className="w-full text-left table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[15%]" />
            <col />
          </colgroup>
          <thead className="bg-zinc-50/80 border-b border-zinc-200/50">
            <tr>
              {["参数名", "类型", "必填", "默认值", "说明"].map(h => (
                <th key={h} className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
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
      <div className={cn("w-1 h-5 rounded-full", color === "violet" ? "bg-violet-500" : "bg-blue-600")} />
      <h4 className="text-base font-bold text-zinc-800">{children}</h4>
    </div>
  )
}

function ParamRow({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-zinc-50/50 transition-colors">{children}</tr>
}

function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-md uppercase">
      {children}
    </span>
  )
}

function PaginationDivider({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <tr>
      <td colSpan={5} className="px-5 py-1.5 bg-violet-50/60 border-y border-violet-100/80">
        <span className="flex items-center gap-1 text-[10px] font-bold text-violet-500">
          <LayoutList className="w-3 h-3" />
          分页参数 · 前置脚本注入
        </span>
      </td>
    </tr>
  )
}

function EmptyParams() {
  return (
    <div className="p-5 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-400 text-center italic">
      该接口无请求参数，可直接调用。
    </div>
  )
}
