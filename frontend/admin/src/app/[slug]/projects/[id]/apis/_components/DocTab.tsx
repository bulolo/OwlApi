"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { LayoutList } from "lucide-react"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useParamSync } from "../_hooks/useParamSync"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useReferenceData } from "../_hooks/useReferenceData"
import type { ParamDef } from "../_types"

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGINATION_PARAMS = [
  { name: "is_pager", type: "integer", default: "1",  desc: "是否分页：1 开启 / 0 返回全量" },
  { name: "page",     type: "integer", default: "1",  desc: "页码，从 1 开始" },
  { name: "size",     type: "integer", default: "10", desc: "每页条数" },
]

// Names managed by the pagination script — hidden from the business param table
// when pagination is enabled to avoid duplication.
const PAGINATION_PARAM_NAMES = new Set(["is_pager", "page", "size", "limit", "offset"])

function hasPaginationLogic(code: string) {
  return code.includes("is_pager") || (code.includes("limit") && code.includes("offset"))
}

// ── cURL builder ──────────────────────────────────────────────────────────────

function buildCurl(
  method: string,
  path: string,
  slug: string,
  baseUrl: string,
  paramDefs: ParamDef[],
  paginationEnabled: boolean,
): string {
  const url = `${baseUrl}/api/v1/tenants/${slug}/query${path}`
  const isQueryMethod = method === "GET" || method === "DELETE"

  const businessEntries = paramDefs.map(d => [d.name, d.default || "value"] as [string, string])
  const paginationEntries: [string, string][] = paginationEnabled
    ? [["is_pager", "1"], ["page", "1"], ["size", "10"]]
    : []
  const allEntries = [...businessEntries, ...paginationEntries]

  if (isQueryMethod) {
    const qs = allEntries.length
      ? "?" + allEntries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
      : ""
    return `curl -X ${method} "${url}${qs}" \\\n  -H "X-Tenant-Slug: ${slug}"`
  }

  const body = JSON.stringify(Object.fromEntries(allEntries), null, 2)
  return (
    `curl -X ${method} "${url}" \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -H "X-Tenant-Slug: ${slug}" \\\n` +
    `  -d '${body}'`
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocTab() {
  const { slug, activeTenant } = useTenantProject()
  const formMethod   = useEndpointFormStore(s => s.form.method)
  const paramDefs    = useEndpointFormStore(s => s.form.paramDefs)
  const preScriptId  = useEndpointFormStore(s => s.form.preScriptId)
  const { extractedParams } = useParamSync()
  const { scripts } = useReferenceData(activeTenant)

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const isQueryMethod = formMethod === "GET" || formMethod === "DELETE"

  const preScript = scripts.find(s => s.id === preScriptId)
  const paginationEnabled = !!preScript && hasPaginationLogic(preScript.code)

  const formPath    = useEndpointFormStore(s => s.form.path)
  const formSummary = useEndpointFormStore(s => s.form.summary)
  const curl = buildCurl(formMethod, formPath, slug, baseUrl, paramDefs, paginationEnabled)

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

          {/* Business params */}
          <div className="space-y-4">
            <SectionTitle color="blue">请求参数</SectionTitle>
            {paramDefs.filter(d => !paginationEnabled || !PAGINATION_PARAM_NAMES.has(d.name)).length > 0 ? (
              <ParamTable isQueryMethod={isQueryMethod}>
                {paramDefs.filter(d => !paginationEnabled || !PAGINATION_PARAM_NAMES.has(d.name)).map(def => {
                  const fromSQL = extractedParams.includes(def.name)
                  return (
                    <ParamRow key={def.name}>
                      <td className="px-5 py-3 font-mono font-bold text-blue-600 text-sm">{def.name}</td>
                      <td className="px-5 py-3"><TypeBadge>{def.type || "string"}</TypeBadge></td>
                      <td className="px-5 py-3 text-sm">
                        {def.required
                          ? <span className="text-red-500 font-bold">是</span>
                          : <span className="text-zinc-400">否</span>}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono text-zinc-500">{def.default || "-"}</td>
                      <td className="px-5 py-3">
                        {fromSQL
                          ? <SourceBadge color="blue">SQL</SourceBadge>
                          : <SourceBadge color="amber">手动</SourceBadge>}
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-500">{def.desc || "-"}</td>
                    </ParamRow>
                  )
                })}
              </ParamTable>
            ) : (
              <EmptyParams />
            )}
          </div>

          {/* Pagination params */}
          {paginationEnabled && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-violet-500 rounded-full" />
                <h4 className="text-sm font-bold text-zinc-800">分页参数</h4>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-50 border border-violet-100 rounded-full">
                  <LayoutList className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-bold text-violet-600">前置脚本注入</span>
                </div>
              </div>
              <ParamTable isQueryMethod={isQueryMethod}>
                {PAGINATION_PARAMS.map(p => (
                  <ParamRow key={p.name}>
                    <td className="px-5 py-3 font-mono font-bold text-violet-600 text-sm">{p.name}</td>
                    <td className="px-5 py-3"><TypeBadge>{p.type}</TypeBadge></td>
                    <td className="px-5 py-3 text-sm"><span className="text-zinc-400">否</span></td>
                    <td className="px-5 py-3 text-sm font-mono text-zinc-500">{p.default}</td>
                    <td className="px-5 py-3"><SourceBadge color="violet">脚本</SourceBadge></td>
                    <td className="px-5 py-3 text-sm text-zinc-500">{p.desc}</td>
                  </ParamRow>
                ))}
              </ParamTable>
            </div>
          )}

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

function SectionTitle({ children, color }: { children: React.ReactNode; color: "blue" | "violet" }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-1 h-4 rounded-full", color === "violet" ? "bg-violet-500" : "bg-blue-600")} />
      <h4 className="text-sm font-bold text-zinc-800">{children}</h4>
    </div>
  )
}

function ParamTable({ children, isQueryMethod }: { children: React.ReactNode; isQueryMethod: boolean }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-zinc-200/80 shadow-sm">
      <div className="px-5 py-2 bg-zinc-50/60 border-b border-zinc-100 flex items-center gap-2">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          传参方式：
        </span>
        <span className="text-[10px] font-bold text-zinc-600">
          {isQueryMethod ? "URL Query String  (?key=value)" : "JSON Body"}
        </span>
      </div>
      <table className="w-full text-left">
        <thead className="bg-zinc-50/80 border-b border-zinc-200/50">
          <tr>
            {["参数名", "类型", "必填", "默认值", "来源", "说明"].map(h => (
              <th key={h} className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
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

function SourceBadge({ children, color }: { children: React.ReactNode; color: "blue" | "amber" | "violet" }) {
  const cls = {
    blue:   "bg-blue-50 text-blue-600 border-blue-100",
    amber:  "bg-amber-50 text-amber-600 border-amber-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
  }[color]
  return (
    <Badge variant="secondary" className={`${cls} text-[10px] font-bold px-1.5 py-0 rounded-md border`}>
      {children}
    </Badge>
  )
}

function EmptyParams() {
  return (
    <div className="p-5 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-400 text-center italic">
      该接口无请求参数，可直接调用。
    </div>
  )
}
