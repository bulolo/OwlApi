"use client"

import { useState, useEffect, useMemo } from "react"
import { useUIStore } from "@/store/useUIStore"
import { apiListEndpoints, apiCreateEndpoint, apiDeleteEndpoint, apiGetProject, apiTestQuery, type APIEndpoint } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, Save, Plus, ChevronRight, Search, Terminal, LayoutTemplate, AlignLeft, Trash2, PanelLeftClose, PanelLeftOpen, FileCode } from "lucide-react"
import { format } from "sql-formatter"
import Editor from "@monaco-editor/react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ResultTable } from "@/components/ResultTable"

export default function ApisPage({ projectId }: { projectId: string }) {
  const { activeTenant } = useUIStore()
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [formPath, setFormPath] = useState("")
  const [formMethod, setFormMethod] = useState("GET")
  const [formSQL, setFormSQL] = useState("")

  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<any>(null)
  const [datasourceId, setDatasourceId] = useState<number>(0)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})

  const extractedParams = useMemo(() => {
    const matches = formSQL.match(/@([a-zA-Z_]\w*)/g)
    if (!matches) return [] as string[]
    return Array.from(new Set(matches.map(m => m.slice(1))))
  }, [formSQL])

  const defaultValues: Record<string, string> = {
    role: "admin", category: "electronics", max_price: "5000",
    status: "completed", name: "", email: "", id: "1",
  }

  const fetchEndpoints = async () => {
    if (!activeTenant) return
    try {
      setLoading(true)
      const data = await apiListEndpoints(activeTenant, Number(projectId))
      setEndpoints(data.list || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchEndpoints()
    if (activeTenant) {
      apiGetProject(activeTenant, Number(projectId)).then(p => setDatasourceId(p.datasource_id)).catch(() => {})
    }
  }, [activeTenant, projectId])

  const handleSelect = (ep: APIEndpoint) => {
    setSelectedId(ep.id)
    setIsNew(false)
    setFormPath(ep.path)
    setFormMethod(ep.methods[0] || "GET")
    setFormSQL(ep.sql)
    setExecResult(null)
    setParamValues({})
  }

  const handleCreateNew = () => {
    setSelectedId(null)
    setIsNew(true)
    setFormPath("/new-endpoint")
    setFormMethod("GET")
    setFormSQL("SELECT * FROM users LIMIT 10")
    setExecResult(null)
    setParamValues({})
  }

  const handleSave = async () => {
    if (!formPath || !formSQL) { setExecResult({ error: "请填写路径和 SQL" }); return }
    const extracted = Array.from(new Set(formSQL.match(/@([a-zA-Z_]\w*)/g)?.map(m => m.slice(1)) || []))
    try {
      setSaving(true)
      await apiCreateEndpoint(activeTenant, Number(projectId), {
        path: formPath, methods: [formMethod], sql: formSQL, params: extracted,
      })
      await fetchEndpoints()
      setIsNew(false)
    } catch (err: any) {
      setExecResult({ error: err.message })
    } finally { setSaving(false) }
  }

  const handleDelete = async (ep: APIEndpoint) => {
    if (!confirm(`确定删除接口 ${ep.path}？`)) return
    try {
      await apiDeleteEndpoint(activeTenant, Number(projectId), ep.id)
      if (selectedId === ep.id) { setSelectedId(null); setIsNew(false) }
      fetchEndpoints()
    } catch (err: any) {
      setExecResult({ error: err.message })
    }
  }

  const handleFormat = () => {
    try {
      let formatted = format(formSQL, { language: "postgresql", keywordCase: "upper" })
      formatted = formatted.replace(/@\s+([a-zA-Z_]\w*)/g, "@$1")
      setFormSQL(formatted)
    } catch {}
  }

  const handleRun = async () => {
    if (!formSQL) { setExecResult({ error: "请输入 SQL" }); return }
    if (!datasourceId) { setExecResult({ error: "项目未绑定数据源，请检查项目设置" }); return }
    setExecuting(true)
    setExecResult(null)
    try {
      let finalSQL = formSQL
      for (const p of extractedParams) {
        const val = paramValues[p] ?? defaultValues[p] ?? ""
        finalSQL = finalSQL.replaceAll(`@${p}`, `'${val.replace(/'/g, "''")}'`)
      }
      const data = await apiTestQuery(activeTenant, datasourceId, finalSQL)
      setExecResult(data)
    } catch (err: any) {
      setExecResult({ error: err.message })
    } finally { setExecuting(false) }
  }

  const isEditing = isNew || selectedId !== null
  const filtered = endpoints.filter(ep => ep.path.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px] min-w-0 overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen ? (
        <div className="w-[260px] shrink-0 flex flex-col bg-white border border-zinc-100 rounded-lg overflow-hidden shadow-sm">
          <div className="p-3 border-b border-zinc-100 bg-zinc-50/30 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] px-1">接口列表 ({endpoints.length})</span>
              <div className="flex items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-zinc-400 transition-colors" onClick={handleCreateNew}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors" onClick={() => setSidebarOpen(false)}>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input placeholder="检索接口..." className="pl-8 h-8 text-[11px] bg-white border-zinc-100 rounded-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-zinc-400 text-xs">加载中...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <FileCode className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-zinc-400 text-xs">暂无接口</p>
              </div>
            ) : filtered.map((ep) => (
              <div
                key={ep.id}
                onClick={() => handleSelect(ep)}
                className={cn(
                  "px-3 py-3 cursor-pointer transition-all duration-200 group flex items-center justify-between border-b border-zinc-50",
                  selectedId === ep.id ? "bg-blue-50/50 border-r-2 border-r-blue-600" : "hover:bg-zinc-50/50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      "font-bold text-[9px] px-1.5 py-0.5 rounded-md uppercase border shadow-sm",
                      ep.methods[0] === "GET" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {ep.methods[0]}
                    </span>
                    {ep.params?.length > 0 && (
                      <span className="text-[9px] text-zinc-400 font-medium">{ep.params.length} 参数</span>
                    )}
                  </div>
                  <div className={cn("text-xs font-bold truncate tracking-tight", selectedId === ep.id ? "text-blue-700" : "text-zinc-700 group-hover:text-blue-600")}>
                    {ep.path}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all" onClick={(e) => { e.stopPropagation(); handleDelete(ep) }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <ChevronRight className={cn("w-3 h-3 text-zinc-300 transition-opacity", selectedId === ep.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          className="h-auto w-9 shrink-0 flex flex-col items-center py-4 bg-white border border-zinc-100 rounded-lg shadow-sm hover:bg-zinc-50 hover:border-blue-600/30 transition-all"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen className="w-3.5 h-3.5 text-zinc-400 mb-2" />
          <span className="text-[9px] font-bold text-zinc-400 [writing-mode:vertical-lr] tracking-wider">接口列表</span>
        </button>
      )}

      {/* Editor workspace */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="h-full flex flex-col border border-zinc-100 rounded-lg bg-white overflow-hidden shadow-sm">
            {/* Header */}
            <div className="h-12 border-b border-zinc-100 flex items-center justify-between px-4 bg-zinc-50/20">
              <div className="flex items-center space-x-1.5 bg-white border border-zinc-100 rounded-lg p-0.5 shadow-sm">
                <select className="h-7 rounded-md border-none bg-transparent px-2 text-[10px] font-bold uppercase text-zinc-600 outline-none cursor-pointer" value={formMethod} onChange={e => setFormMethod(e.target.value)}>
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                </select>
                <div className="w-[1px] h-4 bg-zinc-100" />
                <Input className="h-7 border-none bg-transparent px-2 text-xs font-mono text-zinc-800 w-[260px] focus-visible:ring-0" value={formPath} onChange={e => setFormPath(e.target.value)} placeholder="/api/v1/.." />
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={handleRun} variant="outline" className="h-8 px-4 rounded-lg text-[10px] font-bold border-zinc-200 shadow-sm transition-all active:scale-95">
                  <Play className="w-3 h-3 mr-1.5 text-blue-600" /> 测试
                </Button>
                {isNew && (
                  <Button onClick={handleSave} disabled={saving} className="h-8 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all active:scale-95">
                    <Save className="w-3 h-3 mr-1.5" /> {saving ? "保存中..." : "保存"}
                  </Button>
                )}
              </div>
            </div>

            {/* SQL Editor + Params */}
            <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0">
                <div className="px-4 py-2 bg-zinc-50/20 border-b border-zinc-100 flex items-center justify-between text-[10px] font-bold text-zinc-400 h-8 uppercase tracking-wide">
                  <span>SQL</span>
                  <Button onClick={handleFormat} variant="ghost" size="sm" className="h-5 text-[10px] px-2 text-zinc-400 hover:text-blue-600 rounded-md transition-colors">
                    <AlignLeft className="w-3 h-3 mr-1" /> 格式化
                  </Button>
                </div>
                <div className="flex-1 relative min-h-[200px] overflow-hidden">
                  <Editor
                    height="100%"
                    defaultLanguage="sql"
                    theme="light"
                    value={formSQL}
                    onChange={val => setFormSQL(val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      padding: { top: 15 },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      renderLineHighlight: "none",
                    }}
                  />
                </div>
              </div>

              {extractedParams.length > 0 && (
                <div className="w-[280px] shrink border-l border-zinc-100 bg-zinc-50/20 flex flex-col min-w-[200px]">
                  <div className="px-4 py-2 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 h-8 uppercase tracking-wide flex items-center gap-2">
                    参数 <Badge variant="secondary" className="text-[9px] h-4 px-1.5 rounded-md">{extractedParams.length}</Badge>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-3">
                    {extractedParams.map(p => (
                      <div key={p} className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-zinc-500 flex items-center gap-1.5">
                          <span className="text-blue-500">@</span>{p}
                        </label>
                        <Input
                          className="h-8 text-[11px] font-mono px-3 border-zinc-200 rounded-lg bg-white"
                          placeholder={defaultValues[p] ?? ""}
                          value={paramValues[p] ?? ""}
                          onChange={e => setParamValues(prev => ({ ...prev, [p]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Result */}
            <div className="h-[200px] flex flex-col border-t border-zinc-100">
              <div className="px-4 py-2 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 h-8 uppercase tracking-wide bg-zinc-50/20">响应结果</div>
              <div className="flex-1 overflow-auto">
                {executing ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : execResult ? (
                  execResult.error ? (
                    <div className="p-4 text-xs text-red-500 font-mono">{execResult.error}</div>
                  ) : Array.isArray(execResult) ? (
                    <ResultTable data={execResult} />
                  ) : (
                    <div className="p-4 text-xs text-zinc-500 font-mono">{JSON.stringify(execResult, null, 2)}</div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <LayoutTemplate className="w-10 h-10 mb-3 text-zinc-300" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">等待执行</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-zinc-200 rounded-lg">
            <div className="w-14 h-14 rounded-lg border border-zinc-100 flex items-center justify-center mb-5 bg-zinc-50 shadow-sm">
              <Terminal className="w-7 h-7 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight">选择或创建接口</h3>
            <p className="text-xs text-zinc-400 mt-2 max-w-xs font-medium">从左侧列表选择一个接口查看 SQL，或创建新接口。</p>
            <Button onClick={handleCreateNew} className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold mt-6 shadow-sm transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> 创建接口
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
