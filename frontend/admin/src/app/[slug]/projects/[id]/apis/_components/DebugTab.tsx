"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Trash2, Terminal, ScrollText, Key, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import Editor from "@monaco-editor/react"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import { apiRun } from "@/lib/api/query"
import { getErrorMessage } from "@/lib/errors"
import type { ParamDef, ExecutionResult } from "../_types"

// ── helpers ───────────────────────────────────────────────────────────────────

function extractPathParamNames(path: string): Set<string> {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? []
  return new Set(matches.map(m => m.slice(1)))
}

type TagColor = "green" | "blue" | "amber"

const colorMap: Record<TagColor, { tag: string; bar: string }> = {
  green: { tag: "bg-emerald-50 text-emerald-600 border-emerald-200", bar: "bg-emerald-500" },
  blue:  { tag: "bg-blue-50 text-blue-600 border-blue-200",          bar: "bg-blue-500"    },
  amber: { tag: "bg-amber-50 text-amber-600 border-amber-200",       bar: "bg-amber-500"   },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DebugTab() {
  const { activeTenant } = useTenantProject()
  const authToken    = useEndpointFormStore(s => s.authToken)
  const setAuthToken = useEndpointFormStore(s => s.setAuthToken)
  const paramJSON    = useEndpointFormStore(s => s.paramJSON)
  const setParamJSON = useEndpointFormStore(s => s.setParamJSON)
  const selectedId   = useApiEditorStore(s => s.selectedId)

  const formPath   = useEndpointFormStore(s => s.form.path)
  const formMethod = useEndpointFormStore(s => s.form.method)
  const paramDefs  = useEndpointFormStore(s => s.form.paramDefs)

  const pathParamNames = extractPathParamNames(formPath)
  const isQueryMethod  = formMethod === "GET" || formMethod === "DELETE"

  const pathParams    = paramDefs.filter(d => pathParamNames.has(d.name))
  const nonPathParams = paramDefs.filter(d => !pathParamNames.has(d.name))

  // Parse current values from paramJSON
  const paramValues = useMemo<Record<string, string>>(() => {
    try { return JSON.parse(paramJSON) } catch { return {} }
  }, [paramJSON])

  function setParam(name: string, value: string) {
    setParamJSON(JSON.stringify({ ...paramValues, [name]: value }, null, 2))
  }

  // Track which optional params are enabled (required + path params always on)
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(() => {
    return new Set(paramDefs.filter(d => !d.required).map(d => d.name))
  })

  // Reset enabled state when paramDefs change (endpoint switched)
  useEffect(() => {
    setEnabledOptional(new Set(paramDefs.filter(d => !d.required).map(d => d.name)))
  }, [paramDefs])

  function isEnabled(def: ParamDef): boolean {
    return def.required || pathParamNames.has(def.name) || enabledOptional.has(def.name)
  }

  function toggleOptional(name: string) {
    setEnabledOptional(prev => {
      const next = new Set(prev)
      if (next.has(name)) { next.delete(name) } else { next.add(name) }
      return next
    })
  }

  // Execution state (local — bypasses store's runDebug so we control enabled params)
  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<ExecutionResult>(null)

  async function handleRun() {
    if (!selectedId) return
    setExecuting(true)
    setExecResult(null)
    try {
      // Build flat params: only include enabled params with non-empty values
      const params: Record<string, string> = {}
      for (const def of paramDefs) {
        if (!isEnabled(def)) continue
        const val = paramValues[def.name] ?? def.default ?? ""
        params[def.name] = val
      }
      const data = await apiRun(activeTenant, selectedId, params)
      setExecResult(data as ExecutionResult)
    } catch (err) {
      setExecResult({ error: getErrorMessage(err) })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left: param inputs ── */}
        <Card className="border-zinc-200/60 shadow-sm bg-white overflow-hidden flex flex-col rounded-lg">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-zinc-100">
            <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" /> 请求参数
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 flex flex-col">
            {/* Auth token */}
            <div className="p-4 space-y-2 border-b border-zinc-100">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3 h-3" /> Auth Token
              </Label>
              <Input
                className="h-8 text-xs font-mono border-zinc-200/80 bg-zinc-50/50 rounded-lg"
                placeholder="Bearer eyJhbGciOiJI..."
                value={authToken}
                onChange={e => setAuthToken(e.target.value)}
              />
            </div>

            {/* Param groups */}
            <div className="p-4 space-y-5">
              {paramDefs.length === 0 && (
                <p className="text-xs text-zinc-400 italic text-center py-4">该接口无请求参数</p>
              )}

              {/* Path */}
              {pathParams.length > 0 && (
                <ParamSection label="路径参数" tag="Path" color="green">
                  {pathParams.map(def => (
                    <ParamRow
                      key={def.name}
                      def={def}
                      value={paramValues[def.name] ?? def.default ?? ""}
                      enabled={true}
                      alwaysOn={true}
                      onChange={v => setParam(def.name, v)}
                      onToggle={() => {}}
                    />
                  ))}
                </ParamSection>
              )}

              {/* Query or Body */}
              {nonPathParams.length > 0 && (
                <ParamSection
                  label={isQueryMethod ? "Query 参数" : "Body 参数"}
                  tag={isQueryMethod ? "Query" : "Body"}
                  color={isQueryMethod ? "blue" : "amber"}
                >
                  {nonPathParams.map(def => (
                    <ParamRow
                      key={def.name}
                      def={def}
                      value={paramValues[def.name] ?? def.default ?? ""}
                      enabled={isEnabled(def)}
                      alwaysOn={def.required}
                      onChange={v => setParam(def.name, v)}
                      onToggle={() => toggleOptional(def.name)}
                    />
                  ))}
                </ParamSection>
              )}
            </div>
          </CardContent>

          <div className="p-4 border-t border-zinc-100 bg-white">
            <Button
              onClick={handleRun}
              disabled={executing}
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 rounded-lg"
            >
              <Send className={cn("w-3.5 h-3.5 mr-2", executing && "animate-pulse")} />
              {executing ? "正在处理..." : "发送请求"}
            </Button>
          </div>
        </Card>

        {/* ── Right: response ── */}
        <Card className="lg:col-span-2 border-zinc-200/60 shadow-sm bg-white overflow-hidden flex flex-col h-[500px] rounded-lg">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-emerald-500" /> 响应结果
              </CardTitle>
              {execResult && !("error" in execResult) && (
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] font-bold">HTTP 200 OK</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative bg-white">
            {executing ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider animate-pulse">正在请求...</p>
              </div>
            ) : execResult ? (
              "error" in execResult ? (
                <div className="p-8 text-sm text-red-500 font-mono">
                  <div className="flex items-center gap-3 mb-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-bold text-xs">
                    <Trash2 className="w-4 h-4" /> 接口执行错误
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed opacity-80 text-xs">{(execResult as { error: string }).error}</pre>
                </div>
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme="light"
                  value={JSON.stringify(execResult, null, 2)}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 20 },
                    wordWrap: "on",
                  }}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-14 h-14 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-center mb-5">
                  <Play className="w-6 h-6 text-zinc-300" />
                </div>
                <h4 className="text-sm font-bold text-zinc-600">等待执行</h4>
                <p className="text-xs text-zinc-400 mt-2 max-w-[220px] leading-relaxed">
                  填写参数后点击「发送请求」，结果将在此展示。
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ParamSection({
  label, tag, color, children,
}: {
  label: string; tag: string; color: TagColor; children: React.ReactNode
}) {
  const c = colorMap[color]
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={cn("w-1 h-3.5 rounded-full shrink-0", c.bar)} />
        <span className="text-xs font-bold text-zinc-700">{label}</span>
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", c.tag)}>{tag}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ParamRow({
  def, value, enabled, alwaysOn, onChange, onToggle,
}: {
  def: ParamDef
  value: string
  enabled: boolean
  alwaysOn: boolean
  onChange: (v: string) => void
  onToggle: () => void
}) {
  return (
    <div className={cn("flex items-center gap-2 transition-opacity", !enabled && "opacity-40")}>
      {/* Toggle: hidden placeholder for always-on params, checkbox for optional */}
      {alwaysOn ? (
        <div className="w-4 shrink-0" />
      ) : (
        <Checkbox
          checked={enabled}
          onCheckedChange={onToggle}
        />
      )}

      {/* Name + type */}
      <div className="w-24 shrink-0 min-w-0">
        <div className="flex items-center gap-1 truncate">
          <span className="text-xs font-mono font-semibold text-zinc-700 truncate">{def.name}</span>
          {def.required && <span className="text-red-500 text-[10px] font-black shrink-0">*</span>}
        </div>
        <span className="text-[10px] text-zinc-400">{def.type || "string"}</span>
      </div>

      {/* Input */}
      <Input
        className="h-8 text-xs font-mono border-zinc-200/80 bg-zinc-50/50 rounded-lg flex-1 min-w-0"
        placeholder={def.default || def.name}
        value={value}
        disabled={!enabled}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
