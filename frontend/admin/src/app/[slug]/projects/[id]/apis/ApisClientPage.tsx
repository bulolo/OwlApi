"use client"

import { useState, useEffect } from "react"
import { useUIStore } from "@/store/useUIStore"
import { apiListEndpoints, apiCreateEndpoint, apiDeleteEndpoint, apiGetProject, apiTestQuery, type APIEndpoint } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, Save, Plus, ChevronRight, Search, Terminal, LayoutTemplate, AlignLeft, Trash2 } from "lucide-react"
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

  const [formPath, setFormPath] = useState("")
  const [formMethod, setFormMethod] = useState("GET")
  const [formSQL, setFormSQL] = useState("")

  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<any>(null)
  const [datasourceId, setDatasourceId] = useState<number>(0)

  const fetchEndpoints = async () => {
    if (!activeTenant) return
    try {
      setLoading(true)
      const data = await apiListEndpoints(activeTenant, Number(projectId))
      setEndpoints(data.list || [])
    } catch (err) {
      console.error("Failed to fetch endpoints", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEndpoints()
    // Load project to get datasource_id
    if (activeTenant) {
      apiGetProject(activeTenant, Number(projectId)).then(p => setDatasourceId(p.datasource_id)).catch(() => {})
    }
  }, [activeTenant, projectId])

  const selected = endpoints.find(e => e.id === selectedId) || null

  const handleSelect = (ep: APIEndpoint) => {
    setSelectedId(ep.id)
    setIsNew(false)
    setFormPath(ep.path)
    setFormMethod(ep.methods[0] || "GET")
    setFormSQL(ep.sql)
    setExecResult(null)
  }

  const handleCreateNew = () => {
    setSelectedId(null)
    setIsNew(true)
    setFormPath("/new-endpoint")
    setFormMethod("GET")
    setFormSQL("SELECT * FROM users LIMIT 10")
    setExecResult(null)
  }

  const handleSave = async () => {
    if (!formPath || !formSQL) return alert("请填写路径和 SQL")
    try {
      setSaving(true)
      await apiCreateEndpoint(activeTenant, Number(projectId), {
        path: formPath,
        methods: [formMethod],
        sql: formSQL,
      })
      await fetchEndpoints()
      setIsNew(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ep: APIEndpoint) => {
    if (!confirm(`确定删除接口 ${ep.path}？`)) return
    try {
      await apiDeleteEndpoint(activeTenant, Number(projectId), ep.id)
      if (selectedId === ep.id) { setSelectedId(null); setIsNew(false) }
      fetchEndpoints()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleFormat = () => {
    try {
      setFormSQL(format(formSQL, { language: "postgresql", keywordCase: "upper" }))
    } catch {}
  }

  const handleRun = async () => {
    if (!formSQL) return alert("请输入 SQL")
    if (!datasourceId) return alert("项目未绑定数据源")
    setExecuting(true)
    setExecResult(null)
    try {
      const data = await apiTestQuery(activeTenant, datasourceId, formSQL)
      setExecResult(data)
    } catch (err: any) {
      setExecResult({ error: err.message })
    } finally {
      setExecuting(false)
    }
  }

  const isEditing = isNew || selectedId !== null

  const filtered = endpoints.filter(ep =>
    ep.path.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="grid grid-cols-12 gap-5 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Sidebar — endpoint list */}
      <div className="col-span-3 flex flex-col bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-zinc-50/50 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">接口列表 ({endpoints.length})</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded hover:bg-zinc-200 text-zinc-600" onClick={handleCreateNew}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
            <Input placeholder="检索..." className="pl-7 h-7 text-[11px] bg-white border-zinc-200 rounded" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-auto divide-y divide-zinc-50">
          {loading ? (
            <div className="p-6 text-center text-zinc-400 text-xs">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-xs">暂无接口</div>
          ) : filtered.map((ep) => (
            <div
              key={ep.id}
              onClick={() => handleSelect(ep)}
              className={cn(
                "p-3 cursor-pointer transition-all group flex items-center justify-between",
                selectedId === ep.id ? "bg-blue-50/50 border-r-2 border-blue-600" : "hover:bg-zinc-50"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "font-bold text-[10px] px-1.5 py-0.5 rounded uppercase border",
                    ep.methods[0] === "GET" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  )}>
                    {ep.methods[0]}
                  </span>
                </div>
                <div className={cn("text-xs font-bold truncate", selectedId === ep.id ? "text-blue-700" : "text-zinc-700")}>
                  {ep.path}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(ep) }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
                <ChevronRight className={cn("w-3 h-3 text-zinc-300", selectedId === ep.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor workspace */}
      <div className="col-span-9">
        {isEditing ? (
          <div className="h-full flex flex-col border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm">
            {/* Header */}
            <div className="h-12 border-b flex items-center justify-between px-4 bg-zinc-50/30">
              <div className="flex items-center space-x-1.5 bg-white border rounded p-0.5 shadow-sm">
                <select className="h-7 rounded border-none bg-transparent px-2 text-[10px] font-bold uppercase text-zinc-600 outline-none" value={formMethod} onChange={e => setFormMethod(e.target.value)}>
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                </select>
                <div className="w-[1px] h-3 bg-zinc-200" />
                <Input className="h-7 border-none bg-transparent px-2 text-xs font-mono text-zinc-800 w-[240px] focus-visible:ring-0" value={formPath} onChange={e => setFormPath(e.target.value)} placeholder="/api/v1/.." />
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={handleRun} variant="outline" className="h-7 px-3 rounded text-[10px] font-bold border-zinc-200">
                  <Play className="w-3 h-3 mr-1.5 text-blue-600" /> 测试
                </Button>
                {isNew && (
                  <Button onClick={handleSave} disabled={saving} className="h-7 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-sm">
                    <Save className="w-3 h-3 mr-1.5" /> {saving ? "保存中..." : "保存"}
                  </Button>
                )}
              </div>
            </div>

            {/* SQL Editor */}
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 bg-zinc-50/30 border-b flex items-center justify-between text-[10px] font-bold text-zinc-400 h-8 uppercase">
                <span>SQL</span>
                <Button onClick={handleFormat} variant="ghost" size="sm" className="h-5 text-[10px] px-2 text-zinc-500 hover:text-blue-600">
                  <AlignLeft className="w-3 h-3 mr-1" /> 格式化
                </Button>
              </div>
              <div className="flex-1 relative min-h-[200px]">
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

            {/* Result */}
            <div className="h-[200px] flex flex-col border-t border-zinc-200">
              <div className="px-4 py-2 border-b text-[10px] font-bold text-zinc-400 h-8 uppercase bg-zinc-50/30">响应结果</div>
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
                    <LayoutTemplate className="w-8 h-8 mb-2 text-zinc-300" />
                    <p className="text-[11px] font-bold text-zinc-400 uppercase">等待执行</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-zinc-200 rounded-lg">
            <Terminal className="w-10 h-10 text-zinc-300 mb-4" />
            <h3 className="text-base font-bold text-zinc-900">选择或创建接口</h3>
            <p className="text-xs text-zinc-400 mt-2 max-w-xs">从左侧列表选择一个接口查看 SQL，或创建新接口。</p>
            <Button onClick={handleCreateNew} className="h-8 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold mt-6 shadow-sm">
              创建接口
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
