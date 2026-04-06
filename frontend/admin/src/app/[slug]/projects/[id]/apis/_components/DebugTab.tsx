"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Play, Trash2, Terminal, ScrollText, Key, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import Editor from "@monaco-editor/react"
import { useEndpointStore } from "../_store/useEndpointStore"
import { useTenantProject } from "../_hooks/useTenantProject"

export function DebugTab() {
  const { activeTenant } = useTenantProject()
  const authToken = useEndpointStore(s => s.authToken)
  const setAuthToken = useEndpointStore(s => s.setAuthToken)
  const paramJSON = useEndpointStore(s => s.paramJSON)
  const setParamJSON = useEndpointStore(s => s.setParamJSON)
  const executing = useEndpointStore(s => s.executing)
  const execResult = useEndpointStore(s => s.execResult)
  const runDebug = useEndpointStore(s => s.runDebug)

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Parameters Card */}
        <Card className="border-zinc-200/60 shadow-sm bg-white overflow-hidden flex flex-col h-[500px] rounded-xl">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-zinc-100">
            <CardTitle className="text-[13px] font-bold text-zinc-800 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" /> 请求参数
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
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
            <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">参数 JSON</Label>
              <Badge variant="outline" className="text-[9px] font-bold opacity-30 rounded-md">JSON</Badge>
            </div>
            <div className="flex-1 relative border-t border-zinc-100">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="light"
                value={paramJSON}
                onChange={val => setParamJSON(val || "{}")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  padding: { top: 12, bottom: 12 },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  renderLineHighlight: "none",
                  tabSize: 2,
                  wordWrap: "on",
                }}
              />
            </div>
          </CardContent>
          <div className="p-4 border-t border-zinc-100 bg-white">
            <Button
              onClick={() => runDebug(activeTenant)}
              disabled={executing}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 rounded-lg group"
            >
              <Send className={cn("w-3.5 h-3.5 mr-2 transition-all", executing && "animate-pulse")} />
              {executing ? "正在处理..." : "执行测试请求"}
            </Button>
          </div>
        </Card>

        {/* Execution Result Card */}
        <Card className="lg:col-span-2 border-zinc-200/60 shadow-sm bg-white overflow-hidden flex flex-col h-[500px] rounded-xl">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-bold text-zinc-800 flex items-center gap-2">
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
                <h4 className="text-sm font-bold text-zinc-700">等待执行</h4>
                <p className="text-xs text-zinc-400 mt-2 max-w-[220px] leading-relaxed">
                  配置参数后点击左侧按钮发起请求，结果将在此展示。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
