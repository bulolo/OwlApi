"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Trash2, Terminal, ScrollText, Key, Send, Globe, Copy, Check, Code } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import Editor from "@monaco-editor/react"
import { useEndpointFormStore } from "../_store/useEndpointFormStore"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useEnvironments } from "@/hooks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { envColor } from "../../_utils/envColor"
import { runEndpoint, useGetProjectAuth, useGetProject } from "@/lib/sdk"
import { getErrorMessage } from "@/lib/errors"
import type { ParamDef, ExecutionResult } from "../_types"

// ── helpers ───────────────────────────────────────────────────────────────────

function extractPathParamNames(path: string): Set<string> {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? []
  return new Set(matches.map(m => m.slice(1)))
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

async function signJwt(secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header  = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })))
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ iat: now, exp: now + 86400 })))
  const input   = `${header}.${payload}`
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input))
  return `${input}.${b64url(sig)}`
}

type TagColor = "green" | "blue" | "amber"

const colorMap: Record<TagColor, { tag: string; bar: string }> = {
  green: { tag: "bg-emerald-50 text-emerald-600 border-emerald-200", bar: "bg-emerald-500" },
  blue:  { tag: "bg-primary/10 text-primary border-primary/30",          bar: "bg-primary/80"    },
  amber: { tag: "bg-amber-50 text-amber-600 border-amber-200",       bar: "bg-amber-500"   },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DebugTab() {
  const { activeTenant, projectId } = useTenantProject()
  const { data: envs = [] } = useEnvironments(activeTenant, Number(projectId))
  const defaultEnv = useMemo(() => envs.find(e => e.is_default) ?? envs[0], [envs])
  const [runEnvId, setRunEnvId] = useState<number>(0)
  // Sync default once envs are loaded (only on first load — don't clobber user's selection)
  useEffect(() => {
    if (runEnvId === 0 && defaultEnv) setRunEnvId(defaultEnv.id)
  }, [defaultEnv, runEnvId])
  const currentEnvId = runEnvId || defaultEnv?.id || 0

  const { data: projectAuth, isLoading: authLoading } = useGetProjectAuth(activeTenant, Number(projectId), {
    query: { enabled: !!activeTenant && !!projectId, staleTime: 30_000 },
  }) as { data: { auth_type: string; keys: Array<{ id: string; type: string; name: string; value: string }> } | undefined; isLoading: boolean }
  const authType = projectAuth?.auth_type ?? "public"
  const authKeys = (projectAuth?.keys ?? []).filter(k => k.type === authType)

  const authToken    = useEndpointFormStore(s => s.authToken)
  const setAuthToken = useEndpointFormStore(s => s.setAuthToken)
  const paramJSON    = useEndpointFormStore(s => s.paramJSON)
  const setParamJSON = useEndpointFormStore(s => s.setParamJSON)
  const selectedId   = useApiEditorStore(s => s.selectedId)

  const formPath   = useEndpointFormStore(s => s.form.path)
  const formMethod = useEndpointFormStore(s => s.form.method)
  const paramDefs  = useEndpointFormStore(s => s.form.paramDefs)

  const pathParamNames = extractPathParamNames(formPath)
  const isGetLike      = formMethod === "GET" || formMethod === "DELETE"

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

  const isEnabled = useCallback(
    (def: ParamDef): boolean => def.required || pathParamNames.has(def.name) || enabledOptional.has(def.name),
    [pathParamNames, enabledOptional],
  )

  function toggleOptional(name: string) {
    setEnabledOptional(prev => {
      const next = new Set(prev)
      if (next.has(name)) { next.delete(name) } else { next.add(name) }
      return next
    })
  }

  const { data: project } = useGetProject(activeTenant, Number(projectId), {
    query: { enabled: !!activeTenant && !!projectId, staleTime: 60_000 },
  })

  // ── cURL command ──────────────────────────────────────────────────────────
  const currentEnvName = useMemo(() => envs.find(e => e.id === currentEnvId)?.name ?? "", [envs, currentEnvId])
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

  const curlCommand = useMemo(() => {
    if (!project?.slug || !currentEnvName) return ""

    // Resolve path params inline
    let resolvedPath = formPath
    for (const name of pathParamNames) {
      resolvedPath = resolvedPath.replace(`:${name}`, encodeURIComponent(paramValues[name] ?? ""))
    }
    const cleanPath = resolvedPath.replace(/^\//, "")
    const url = `${API_BASE}/-/${currentEnvName}/${activeTenant}/${project.slug}/${cleanPath}`

    // Collect enabled non-path params
    const bodyParams: Record<string, string> = {}
    for (const def of paramDefs) {
      if (pathParamNames.has(def.name)) continue
      if (!isEnabled(def)) continue
      bodyParams[def.name] = paramValues[def.name] ?? def.default ?? ""
    }

    const isGetLike = formMethod === "GET" || formMethod === "DELETE"
    const lines: string[] = []

    if (formMethod !== "GET") lines.push(`curl -X ${formMethod} \\`)
    else lines.push(`curl \\`)

    const qs = isGetLike && Object.keys(bodyParams).length > 0
      ? "?" + Object.entries(bodyParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
      : ""
    lines.push(`  "${url}${qs}" \\`)

    if (authToken) lines.push(`  -H "Authorization: ${authToken}" \\`)

    if (!isGetLike && Object.keys(bodyParams).length > 0) {
      lines.push(`  -H "Content-Type: application/json" \\`)
      lines.push(`  -d '${JSON.stringify(bodyParams)}'`)
    } else {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, "")
    }

    return lines.join("\n")
  }, [project, currentEnvName, formPath, formMethod, pathParamNames, paramValues, paramDefs, isEnabled, authToken, activeTenant, API_BASE])

  // ── result tab state ──────────────────────────────────────────────────────
  const [resultTab, setResultTab] = useState<"result" | "curl">("result")
  const [copied, setCopied] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<ExecutionResult>(null)

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRun() {
    if (!selectedId) return
    setResultTab("result")
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
      const data = await runEndpoint(activeTenant, Number(projectId), {
        endpoint_id: selectedId,
        env_id: currentEnvId,
        params,
        auth_credential: authToken || undefined,
      })
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
        <Card className="border-border/60 shadow-card bg-white overflow-hidden flex flex-col rounded-lg">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border-subtle">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary/80" /> 请求参数
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 flex flex-col">
            {/* Auth token */}
            <div key={authType} className="p-4 space-y-2 border-b border-border-subtle">
              {authLoading ? (
                <div className="h-8 animate-pulse bg-zinc-100 rounded-lg" />
              ) : authType === "public" ? (
                <div className="h-8 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" /> 公开访问，无需鉴权
                </div>
              ) : (
                <>
                  <Label className="text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3 h-3" /> Authorization
                  </Label>
                  {authKeys.length > 0 && (
                    <Select value="" onValueChange={async v => {
                      if (authType === "jwt") {
                        const token = await signJwt(v)
                        setAuthToken(`Bearer ${token}`)
                      } else {
                        setAuthToken(`Bearer ${v}`)
                      }
                    }}>
                      <SelectTrigger className="h-8 text-xs font-mono border-border/80 bg-zinc-50/50 rounded-lg">
                        <SelectValue placeholder="从已有密钥快速填充…" />
                      </SelectTrigger>
                      <SelectContent>
                        {authKeys.map(k => (
                          <SelectItem key={k.id} value={k.value} className="font-mono text-xs">
                            {k.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    className="h-8 text-xs font-mono border-border/80 bg-zinc-50/50 rounded-lg"
                    placeholder={authType === "api_key" ? "Bearer <api-key>" : "Bearer eyJhbGciOiJI..."}
                    value={authToken}
                    onChange={e => setAuthToken(e.target.value)}
                  />
                </>
              )}
            </div>

            {/* Param groups */}
            <div className="p-4 space-y-5">
              {paramDefs.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4">该接口无请求参数</p>
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
                  label={isGetLike ? "Query 参数" : "Body 参数"}
                  tag={isGetLike ? "Query" : "Body"}
                  color={isGetLike ? "blue" : "amber"}
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

          <div className="p-4 border-t border-border-subtle bg-white space-y-2">
            {envs.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-2xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">在哪个环境运行</Label>
                <Select value={String(currentEnvId)} onValueChange={v => setRunEnvId(Number(v))}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {envs.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", envColor(e.name).bg)} />
                          <span className="font-bold">{e.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={handleRun}
              disabled={executing || !currentEnvId}
              className="w-full h-9 font-bold text-xs shadow-sm rounded-lg"
            >
              <Send className={cn("w-3.5 h-3.5 mr-2", executing && "animate-pulse")} />
              {executing ? "正在处理..." : "发送请求"}
            </Button>
          </div>
        </Card>

        {/* ── Right: result / curl ── */}
        <Card className="lg:col-span-2 border-border/60 shadow-card bg-white overflow-hidden flex flex-col h-[500px] rounded-lg">
          <CardHeader className="pb-0 pt-3 px-5 border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setResultTab("result")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t border-b-2 transition-colors",
                    resultTab === "result"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ScrollText className="w-3.5 h-3.5" /> 执行结果
                </button>
                <button
                  onClick={() => setResultTab("curl")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t border-b-2 transition-colors",
                    resultTab === "curl"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Code className="w-3.5 h-3.5" /> cURL
                </button>
              </div>
              {resultTab === "result" && execResult && !("error" in execResult) && (
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-2xs font-bold">HTTP 200 OK</Badge>
              )}
              {resultTab === "curl" && curlCommand && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-muted-foreground hover:text-foreground px-2 text-2xs gap-1"
                  onClick={() => copyToClipboard(curlCommand)}
                >
                  {copied
                    ? <><Check className="w-3 h-3 text-emerald-500" /><span>已复制</span></>
                    : <><Copy className="w-3 h-3" /><span>复制</span></>}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 relative bg-white overflow-hidden">
            {/* 执行结果 */}
            {resultTab === "result" && (
              executing ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider animate-pulse">正在请求...</p>
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
                  <div className="w-14 h-14 bg-zinc-50 rounded-xl border border-border-subtle flex items-center justify-center mb-5">
                    <Play className="w-6 h-6 text-zinc-300" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-600">等待执行</h4>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[220px] leading-relaxed">
                    填写参数后点击「发送请求」，结果将在此展示。
                  </p>
                </div>
              )
            )}

            {/* cURL */}
            {resultTab === "curl" && (
              curlCommand ? (
                <div className="h-full flex flex-col p-4">
                  <pre className="flex-1 overflow-auto rounded-lg bg-zinc-950 px-5 py-4 text-sm font-mono leading-7 whitespace-pre border border-zinc-800">
                    <CurlHighlight command={curlCommand} />
                  </pre>
                  <p className="text-2xs text-muted-foreground mt-2 shrink-0">
                    ⚠ 仅适用于已发布且上线的接口；「发送请求」可调试下线接口
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 bg-zinc-50 rounded-xl border border-border-subtle flex items-center justify-center mb-5">
                    <Terminal className="w-6 h-6 text-zinc-300" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-600">等待生成</h4>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[220px] leading-relaxed">
                    选择环境并配置参数后自动生成。
                  </p>
                </div>
              )
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

// ── CurlHighlight ─────────────────────────────────────────────────────────────

function CurlHighlight({ command }: { command: string }) {
  return (
    <>
      {command.split("\n").map((line, i, arr) => (
        <span key={i}>
          {highlightLine(line)}
          {i < arr.length - 1 ? "\n" : ""}
        </span>
      ))}
    </>
  )
}

function highlightLine(line: string): React.ReactNode {
  const t = line.trimStart()

  // curl [-X METHOD] \
  if (t.startsWith("curl")) {
    const m = line.match(/^(curl)(\s+-X\s+(\w+))?(\s+\\)?$/)
    if (m) return <>
      <span className="text-white font-semibold">{m[1]}</span>
      {m[2] && <><span className="text-zinc-500"> -X </span><span className="text-white font-semibold">{m[3]}</span></>}
      {m[4] && <span className="text-zinc-600">{m[4]}</span>}
    </>
  }

  // URL line:   "https://..." \
  if (t.startsWith('"')) {
    const m = line.match(/^(\s+)(".*?")(\s*\\?)$/)
    if (m) return <>
      <span>{m[1]}</span>
      <span className="text-sky-300">{m[2]}</span>
      <span className="text-zinc-600">{m[3]}</span>
    </>
  }

  // Header: -H "Key: value" \
  if (t.startsWith("-H")) {
    const m = line.match(/^(\s+)(-H\s+)(")([^:]+)(:\s*)([^"]*)(")(\s*\\?)$/)
    if (m) return <>
      <span>{m[1]}</span>
      <span className="text-zinc-500">{m[2]}</span>
      <span className="text-zinc-600">{m[3]}</span>
      <span className="text-zinc-300">{m[4]}</span>
      <span className="text-zinc-600">{m[5]}</span>
      <span className="text-zinc-400">{m[6]}</span>
      <span className="text-zinc-600">{m[7]}{m[8]}</span>
    </>
  }

  // Body: -d '...'
  if (t.startsWith("-d")) {
    const m = line.match(/^(\s+)(-d\s+)('.*')(\s*\\?)$/)
    if (m) return <>
      <span>{m[1]}</span>
      <span className="text-zinc-500">{m[2]}</span>
      <span className="text-zinc-300">{m[3]}</span>
      <span className="text-zinc-600">{m[4]}</span>
    </>
  }

  return <span className="text-zinc-400">{line}</span>
}

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
        <span className={cn("text-2xs font-bold px-1.5 py-0.5 rounded border", c.tag)}>{tag}</span>
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
          <span className="text-xs font-mono font-bold text-zinc-700 truncate">{def.name}</span>
          {def.required && <span className="text-red-500 text-2xs font-black shrink-0">*</span>}
        </div>
        <span className="text-2xs text-muted-foreground">{def.type || "string"}</span>
      </div>

      {/* Input */}
      <Input
        className="h-8 text-xs font-mono border-border/80 bg-zinc-50/50 rounded-lg flex-1 min-w-0"
        placeholder={def.default || def.name}
        value={value}
        disabled={!enabled}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
