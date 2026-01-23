"use client"

import { useState } from "react"
import { useProjectStore, type ApiEndpoint } from "@/store/useProjectStore"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Play, Save, Plus, Globe, FileJson, Terminal, ChevronRight, Search, LayoutTemplate } from "lucide-react"
import Editor from "@monaco-editor/react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export default function ApisPage({ projectId }: { projectId: string }) {
  const { projects, addApi, updateApi, deleteApi, executeSql } = useProjectStore()
  const project = projects.find(p => p.id === projectId)

  const [selectedApi, setSelectedApi] = useState<ApiEndpoint | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState<Partial<ApiEndpoint>>({
    method: 'GET',
    path: '/',
    sql: 'SELECT * FROM users',
    description: ''
  })

  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<string | null>(null)

  if (!project) return <div className="p-20 text-center text-zinc-500">找不到项目数据</div>

  const filteredApis = project.apis.filter(api =>
    api.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (api: ApiEndpoint) => {
    setSelectedApi(api)
    setFormData(api)
    setIsEditing(true)
    setExecResult(null)
  }

  const handleCreateNew = () => {
    setSelectedApi(null)
    setFormData({ method: 'GET', path: '/api/v1/new', sql: 'SELECT * FROM products LIMIT 10', description: '新创建的 API 接口' })
    setIsEditing(true)
    setExecResult(null)
  }

  const handleSave = () => {
    if (selectedApi) {
      updateApi(project.id, selectedApi.id, formData)
    } else {
      addApi(project.id, formData as ApiEndpoint)
    }
  }

  const handleRun = async () => {
    if (!formData.sql) return
    setExecuting(true)
    try {
      const res = await executeSql(formData.sql)
      setExecResult(JSON.stringify(res, null, 2))
    } catch (e) {
      setExecResult("错误: " + e)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-5 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Dense Mini Sidebar */}
      <div className="col-span-3 flex flex-col bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-zinc-50/50 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Endpoints ({project.apis.length})</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded hover:bg-zinc-200 text-zinc-600" onClick={handleCreateNew}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
            <Input
              placeholder="快速检索..."
              className="pl-7 h-7 text-[11px] bg-white border-zinc-200 rounded focus:ring-1"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto divide-y divide-zinc-50 custom-scrollbar">
          {filteredApis.map((api) => (
            <div
              key={api.id}
              onClick={() => handleSelect(api)}
              className={cn(
                "p-3 cursor-pointer transition-all duration-150 group flex flex-col",
                selectedApi?.id === api.id
                  ? "bg-blue-50/50 border-r-2 border-blue-600"
                  : "hover:bg-zinc-50"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "font-bold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-tighter border",
                  api.method === 'GET' ? "bg-blue-50 text-blue-600 border-blue-100" :
                    api.method === 'POST' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      "bg-orange-50 text-orange-600 border-orange-100"
                )}>
                  {api.method}
                </span>
                <ChevronRight className={cn("w-3 h-3 text-zinc-300 transition-opacity", selectedApi?.id === api.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
              </div>
              <div className={cn("text-xs font-bold truncate", selectedApi?.id === api.id ? "text-blue-700" : "text-zinc-700")}>
                {api.path}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tighter Editor Workspace */}
      <div className="col-span-9">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm"
            >
              {/* Workspace Header */}
              <div className="h-12 border-b flex items-center justify-between px-4 bg-zinc-50/30">
                <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                  <div className="flex items-center space-x-1.5 bg-white border rounded p-0.5 shadow-sm">
                    <select
                      className="h-7 rounded border-none bg-transparent px-2 text-[10px] font-bold uppercase tracking-tight text-zinc-600 focus:ring-0 outline-none"
                      value={formData.method}
                      onChange={e => setFormData({ ...formData, method: e.target.value as any })}
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                    </select>
                    <div className="w-[1px] h-3 bg-zinc-200" />
                    <Input
                      className="h-7 border-none bg-transparent px-2 text-xs font-mono text-zinc-800 w-[200px] focus-visible:ring-0 placeholder:text-zinc-300"
                      value={formData.path}
                      onChange={e => setFormData({ ...formData, path: e.target.value })}
                      placeholder="/api/v1/.."
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={handleRun} variant="outline" className="h-7 px-3 rounded text-[10px] font-bold border-zinc-200 hover:bg-zinc-50">
                    <Play className="w-3 h-3 mr-1.5 text-blue-600" />
                    执行推演
                  </Button>
                  <Button onClick={handleSave} className="h-7 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-sm">
                    <Save className="w-3 h-3 mr-1.5" />
                    保存更新
                  </Button>
                </div>
              </div>

              {/* Development Split */}
              <div className="flex-1 grid grid-cols-12 overflow-hidden bg-white">
                {/* Slimmer Editor */}
                <div className="col-span-12 lg:col-span-7 flex flex-col border-r border-zinc-100">
                  <div className="px-4 py-2 bg-zinc-50/30 border-b flex items-center justify-between text-[10px] font-bold text-zinc-400 tracking-tight h-8 uppercase">
                    <span>SQL Core Engine</span>
                    <span>Line 1</span>
                  </div>
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      defaultLanguage="sql"
                      theme="light" // Switched to light monaco
                      value={formData.sql}
                      onChange={val => setFormData({ ...formData, sql: val || '' })}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        padding: { top: 15 },
                        fontFamily: "'Inter', 'Menlo', monospace",
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        renderLineHighlight: "none",
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true
                      }}
                    />
                  </div>
                </div>

                {/* Dense Preview Panel */}
                <div className="col-span-12 lg:col-span-5 flex flex-col bg-zinc-50/10">
                  <div className="px-4 py-2 border-b flex items-center justify-between text-[10px] font-bold text-zinc-400 tracking-tight h-8 uppercase">
                    <span>Dynamic Response</span>
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    <AnimatePresence mode="wait">
                      {executing ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Processing</span>
                        </div>
                      ) : execResult ? (
                        <div className="bg-white border rounded p-4 font-mono text-[11px] text-zinc-600 shadow-inner h-full overflow-auto whitespace-pre-wrap leading-relaxed">
                          {execResult}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-center grayscale py-10">
                          <LayoutTemplate className="w-8 h-8 mb-4 text-zinc-300" />
                          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">Ready for push</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-zinc-200 rounded-lg shadow-inner">
              <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-center mb-5">
                <Terminal className="w-6 h-6 text-zinc-300" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-tight">研发控制台</h3>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs font-medium leading-relaxed">
                请从左侧列表选择一个 API 断点，或开始初始化全新的端点映射。
              </p>
              <Button onClick={handleCreateNew} className="h-8 px-5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[10px] font-bold mt-6 shadow-sm">
                快速开始
              </Button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
