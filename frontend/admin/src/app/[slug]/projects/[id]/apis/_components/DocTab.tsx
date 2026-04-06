"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useEndpointStore } from "../_store/useEndpointStore"
import { useParamSync } from "../_hooks/useParamSync"
import { useTenantProject } from "../_hooks/useTenantProject"
import type { ParamDef } from "../_types"

const getDefaultValue = (paramDefs: ParamDef[], name: string): string => {
  return paramDefs.find(d => d.name === name)?.default ?? ""
}

export function DocTab() {
  const { slug } = useTenantProject()
  const formMethod = useEndpointStore(s => s.form.method)
  const formPath = useEndpointStore(s => s.form.path)
  const paramDefs = useEndpointStore(s => s.form.paramDefs)
  const { extractedParams } = useParamSync()

  const apiParams = paramDefs.map(d => d.name).filter(Boolean)

  return (
    <div className="p-0 animate-in fade-in duration-300">
      <div className="flex-1 overflow-auto p-10 custom-scrollbar bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Method + Path */}
          <div className="flex items-center gap-3">
            <span className={cn(
              "font-black text-xs px-3 py-1.5 rounded-lg uppercase",
              formMethod === "GET" ? "bg-blue-50 text-blue-600"
                : formMethod === "POST" ? "bg-emerald-50 text-emerald-600"
                : formMethod === "PUT" ? "bg-amber-50 text-amber-600"
                : formMethod === "DELETE" ? "bg-red-50 text-red-600"
                : "bg-zinc-100 text-zinc-600"
            )}>{formMethod}</span>
            <code className="text-lg font-mono font-bold text-zinc-800 tracking-tight">{formPath}</code>
          </div>

          {/* Parameters Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full" />
              <h4 className="text-sm font-bold text-zinc-800">请求参数</h4>
            </div>

            {apiParams.length > 0 ? (
              <div className="bg-white rounded-xl overflow-hidden border border-zinc-200/80 shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200/50">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">参数名</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">类型</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">必填</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">默认值</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">来源</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">说明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {apiParams.map(p => {
                      const def = paramDefs.find(d => d.name === p)
                      const fromSQL = extractedParams.includes(p)
                      return (
                        <tr key={p} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-5 py-3 text-sm font-mono font-bold text-blue-600">{p}</td>
                          <td className="px-5 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-md uppercase">
                              {def?.type || "string"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm">
                            {def?.required ? <span className="text-red-500 font-bold">是</span> : <span className="text-zinc-400">否</span>}
                          </td>
                          <td className="px-5 py-3 text-sm font-mono text-zinc-500">{def?.default || "-"}</td>
                          <td className="px-5 py-3">
                            {fromSQL ? (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-bold px-1.5 py-0 rounded-md">SQL</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-100 text-[10px] font-bold px-1.5 py-0 rounded-md">脚本</Badge>
                            )}
                          </td>
                          <td className="px-5 py-3 text-sm text-zinc-500">{def?.desc || "-"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-400 text-center italic">
                该接口无请求参数，可直接调用。
              </div>
            )}
          </div>

          {/* cURL Example */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full" />
              <h4 className="text-sm font-bold text-zinc-800">调用示例</h4>
            </div>
            <div className="relative">
              <div className="relative bg-zinc-900 rounded-xl p-5 font-mono text-sm leading-relaxed text-emerald-400 shadow-lg border border-zinc-800 overflow-x-auto">
                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">cURL</span>
                  <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700 rounded-md">Bash</Badge>
                </div>
                {`curl -X ${formMethod} "http://localhost:3000/api/v1/query${formPath}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Tenant-Slug: ${slug}" \\\n  -d '${JSON.stringify(
                  Object.fromEntries(apiParams.map(p => [p, getDefaultValue(paramDefs, p) || "value"])),
                  null,
                  2
                )}'`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
