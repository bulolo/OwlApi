"use client"

import { useState, useEffect } from "react"
import { useProjectStore, type ApiEndpoint } from "@/store/useProjectStore"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Play, Save, Plus, Globe, FileJson, Terminal, ChevronRight, Search, LayoutTemplate, AlignLeft } from "lucide-react"
import { format } from "sql-formatter"
import Editor from "@monaco-editor/react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ResultTable } from "@/components/ResultTable"

export default function ApisPage({ projectId }: { projectId: string }) {
  const { projects, addApi, updateApi, deleteApi, executeSql } = useProjectStore()
  const project = projects.find(p => p.id === projectId)

  const [selectedApi, setSelectedApi] = useState<ApiEndpoint | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState<Partial<ApiEndpoint>>({
    method: 'POST',
    path: '/',
    sql: 'SELECT * FROM users WHERE id = :id',
    description: '',
    parameters: []
  })

  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<any | null>(null)
  // Local state to hold test values for execution
  const [testValues, setTestValues] = useState<Record<string, string>>({})

  // Auto-sync parameters from SQL
  useEffect(() => {
    const timer = setTimeout(() => {
        if (!formData.sql) return
        
        // Regex to find :paramName
        const regex = /:([a-zA-Z0-9_]+)/g
        const matches = Array.from(formData.sql.matchAll(regex))
        const foundParamNames = Array.from(new Set(matches.map(m => m[1])))

        const currentParams = formData.parameters || []
        
        // Check if params actually changed to avoid infinite loops/unnecessary renders
        const currentNames = currentParams.map(p => p.name).sort().join(',')
        const newNames = [...foundParamNames].sort().join(',')
        
        if (currentNames === newNames) return

        const newParams = foundParamNames.map(name => {
          const existing = currentParams.find(p => p.name === name)
          return existing || {
            name,
            type: 'string', // Default type
            required: true,
            defaultValue: ''
          }
        })
        
        setFormData(prev => ({ ...prev, parameters: newParams as any }))
    }, 800) // Debounce 800ms

    return () => clearTimeout(timer)
  }, [formData.sql])

  if (!project) return <div className="p-20 text-center text-zinc-500">找不到项目数据</div>

  const filteredApis = project.apis.filter(api =>
    api.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (api: ApiEndpoint) => {
    setSelectedApi(api)
    setFormData(api)
    // Reset test values when selecting a new API
    const initialTestValues: Record<string, string> = {}
    if (api.parameters) {
      api.parameters.forEach(p => {
        if (p.defaultValue) initialTestValues[p.name] = p.defaultValue
      })
    }
    setTestValues(initialTestValues)
    setIsEditing(true)
    setExecResult(null)
  }

  const handleFormat = () => {
    if (!formData.sql) return
    try {
      const formatted = format(formData.sql, { 
        language: 'postgresql', 
        keywordCase: 'upper' 
      })
      setFormData({ ...formData, sql: formatted })
    } catch (e) {
      console.warn("Formatting failed", e)
    }
  }

  const handleCreateNew = () => {
    setSelectedApi(null)
    setFormData({ 
      method: 'POST', 
      path: '/api/v1/new', 
      sql: 'SELECT * FROM products WHERE category = :category LIMIT 10', 
      description: '新创建的 API 接口', 
      parameters: [
        { name: 'category', type: 'string', required: true, defaultValue: '' }
      ] 
    })
    setTestValues({})
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

  const handleSyncParams = () => {
    if (!formData.sql) return
    // Regex to find :paramName
    const regex = /:([a-zA-Z0-9_]+)/g
    const matches = Array.from(formData.sql.matchAll(regex))
    const foundParamNames = Array.from(new Set(matches.map(m => m[1])))

    const currentParams = formData.parameters || []
    const newParams = foundParamNames.map(name => {
      const existing = currentParams.find(p => p.name === name)
      return existing || {
        name,
        type: 'string', // Default type
        required: true,
        defaultValue: ''
      }
    })
    
    // Cast to any to avoid strict type issues with Partial<ApiEndpoint> vs ApiParameter
    setFormData({ ...formData, parameters: newParams as any })
  }

  const handleRun = async () => {
    if (!formData.sql) return
    setExecuting(true)
    try {
      // Basic substitution for the mock run
      let runSql = formData.sql
      Object.entries(testValues).forEach(([key, val]) => {
         runSql = runSql.replace(new RegExp(`:${key}\\b`, 'g'), `'${val}'`)
      })

      const res = await executeSql(runSql)
      const data = typeof res === 'string' ? JSON.parse(res) : res
      setExecResult(data)
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
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">接口列表 ({project.apis.length})</span>
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

                {/* TOP HALF: Logic Construction */}
                <div className="flex-1 grid grid-cols-12 min-h-0 divide-x divide-zinc-100">
                  {/* LEFT: SQL Editor */}
                  <div className="col-span-8 flex flex-col">
                    <div className="px-4 py-2 bg-zinc-50/30 border-b flex items-center justify-between text-[10px] font-bold text-zinc-400 tracking-tight h-8 uppercase">
                      <span>SQL 核心引擎</span>
                      <div className="flex items-center gap-2">
                        <Button onClick={handleFormat} variant="ghost" size="sm" className="h-5 text-[9px] px-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50">
                          <AlignLeft className="w-3 h-3 mr-1" />
                          格式化
                        </Button>
                        <div className="w-[1px] h-3 bg-zinc-200" />
                        <Button onClick={handleSyncParams} variant="ghost" size="sm" className="h-5 text-[9px] px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Terminal className="w-3 h-3 mr-1" />
                          解析参数
                        </Button>
                        <span>行 1</span>
                      </div>
                    </div>
                    <div className="flex-1 relative">
                       <Editor
                          height="100%"
                          defaultLanguage="sql"
                          theme="light"
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

                  {/* RIGHT: Params & Body Preview */}
                  <div className="col-span-4 flex flex-col bg-zinc-50/20">
                     <div className="px-4 py-2 border-b flex items-center justify-between text-[10px] font-bold text-zinc-400 tracking-tight h-8 uppercase bg-zinc-50/50">
                       <span>请求参数配置 (Body)</span>
                       <Badge variant="outline" className="text-[9px] h-4 border-zinc-200 text-zinc-500 bg-white">
                         application/json
                       </Badge>
                    </div>
                    
                    <div className="flex-1 flex flex-col overflow-hidden">
                       <div className="flex-1 overflow-auto p-0">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-transparent hover:bg-transparent border-none">
                                <TableHead className="h-7 text-[10px] pl-4">参数名</TableHead>
                                <TableHead className="h-7 text-[10px] w-[85px]">类型</TableHead>
                                <TableHead className="h-7 text-[10px] w-[100px] pr-4">测试值</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(!formData.parameters || formData.parameters.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-8 text-xs text-zinc-400 italic">
                                     未检测到参数，请在 SQL 中使用 :name
                                  </TableCell>
                                </TableRow>
                              )}
                              {formData.parameters?.map((param, idx) => (
                                <TableRow key={idx} className="border-none hover:bg-zinc-50/50">
                                  <TableCell className="py-1 pl-4 font-mono text-xs font-bold text-blue-600 align-middle">
                                    :{param.name}
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <select 
                                      className="h-6 w-full rounded border border-zinc-200 bg-white px-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      value={param.type}
                                      onChange={(e) => {
                                        const newParams = [...(formData.parameters || [])];
                                        newParams[idx] = { ...newParams[idx], type: e.target.value as any };
                                        setFormData({ ...formData, parameters: newParams });
                                      }}
                                    >
                                      <option value="string">字符串</option>
                                      <option value="number">数字</option>
                                      <option value="boolean">布尔值</option>
                                    </select>
                                  </TableCell>
                                  <TableCell className="py-1 pr-4">
                                    <Input 
                                      className="h-6 text-xs bg-white" 
                                      placeholder="值..." 
                                      value={testValues[param.name] || ''}
                                      onChange={(e) => setTestValues({...testValues, [param.name]: e.target.value})}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                       </div>
                       
                       {/* JSON Body Preview */}
                       <div className="h-[120px] bg-zinc-50 p-3 overflow-auto border-t border-zinc-100">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1 block">JSON 预览</span>
                          <pre className="font-mono text-[10px] text-zinc-600 whitespace-pre-wrap break-all leading-tight">
                            {JSON.stringify(testValues, null, 2)}
                          </pre>
                       </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM HALF: Dynamic Response */}
                <div className="h-[300px] flex flex-col bg-zinc-50/10 border-t border-zinc-200">
                  <div className="px-4 py-2 border-b flex items-center justify-between text-[10px] font-bold text-zinc-400 tracking-tight h-8 uppercase bg-zinc-50/30">
                    <span>响应结果</span>
                  </div>
                  <div className="flex-1 p-0 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                      {executing ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">处理中...</span>
                        </div>
                      ) : execResult ? (
                        typeof execResult === 'string' && execResult.startsWith('错误') ? (
                           <div className="bg-red-50 border border-red-200 m-4 rounded p-4 text-red-600 font-mono text-xs">
                             {execResult}
                           </div>
                        ) : (
                          <div className="h-full w-full overflow-hidden">
                             <ResultTable data={execResult} />
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-center grayscale py-10">
                          <LayoutTemplate className="w-8 h-8 mb-4 text-zinc-300" />
                          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">等待执行</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-zinc-200 rounded-lg shadow-inner">
               {/* Empty State */}
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
