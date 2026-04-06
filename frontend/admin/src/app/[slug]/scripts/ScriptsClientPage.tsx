"use client"

import { useState } from "react"
import { useUIStore } from "@/store/useUIStore"
import { useScripts, useCreateScript, useUpdateScript, useDeleteScript } from "@/hooks"
import type { Script } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, FileCode2, Trash2, Save, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import Editor from "@monaco-editor/react"
import { toast } from "sonner"
import { Pager } from "@/components/ui/pager"

const TEMPLATE_PRE = `// 前置脚本 — 在 SQL 执行前处理参数
//
// 输入 params: { "page": "1", "size": "10", "name": "张三", ... }
//   所有值均为字符串（来自请求 JSON Body）
//
// 输出: 返回处理后的 params，供 SQL 中 @变量 替换使用
//
// 示例: 将 page/size 换算为 limit/offset
function main(params) {
  var page = Number(params.page || 1);
  var size = Number(params.size || 10);
  params.limit = String(size);
  params.offset = String((page - 1) * size);
  return params;
}
`

const TEMPLATE_POST = `// 后置脚本 — SQL 执行后处理返回数据
//
// 输入 data: SQL 查询结果数组
//   SELECT 时: [{ "id": 1, "name": "张三" }, { "id": 2, "name": "李四" }]
//   INSERT/UPDATE/DELETE 时: [{ "affected_rows": 1 }]
//
// 输入 params: 请求参数（和前置脚本输出一致）
//
// 输出: 返回任意结构，直接作为 API 响应体
//
// 示例: 包装为标准列表响应
function main(data, params) {
  return {
    code: 0,
    data: {
      list: data,
      pagination: {
        page: Number(params.page || 1),
        size: Number(params.size || 10),
        total: data.length
      }
    },
    msg: "请求成功"
  };
}
`

export default function ScriptsClientPage() {
  const { activeTenant } = useUIStore()
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const SIZE = 20
  const { scripts, pagination, isLoading: loading } = useScripts(activeTenant, { page, size: SIZE, keyword })
  const createMutation = useCreateScript(activeTenant)
  const updateMutation = useUpdateScript(activeTenant)
  const deleteMutation = useDeleteScript(activeTenant)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)

  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<"pre" | "post">("pre")
  const [formCode, setFormCode] = useState("")
  const [formDesc, setFormDesc] = useState("")

  const selected = scripts.find(s => s.id === selectedId) || null

  const handleSelect = (s: Script) => {
    setSelectedId(s.id)
    setEditing(false)
    setFormName(s.name)
    setFormType(s.type as "pre" | "post")
    setFormCode(s.code)
    setFormDesc(s.description ?? "")
  }

  const handleNew = (type: "pre" | "post") => {
    setSelectedId(null)
    setEditing(true)
    setFormName("")
    setFormType(type)
    setFormCode(type === "pre" ? TEMPLATE_PRE : TEMPLATE_POST)
    setFormDesc("")
  }

  const saving = createMutation.isPending || updateMutation.isPending

  const handleSave = async () => {
    if (!formName || !formCode) return
    const payload = { name: formName, type: formType, code: formCode, description: formDesc }
    if (editing && !selectedId) {
      createMutation.mutate(payload, {
        onSuccess: (created) => { setSelectedId(created.id); setEditing(false) },
      })
    } else if (selectedId) {
      updateMutation.mutate({ id: selectedId, req: payload })
    }
  }

  const handleDelete = (s: Script) => {
    if (!confirm(`确定删除脚本「${s.name}」？`)) return
    deleteMutation.mutate(s.id, {
      onSuccess: () => { if (selectedId === s.id) { setSelectedId(null); setEditing(false) } },
    })
  }

  const preScripts = scripts.filter(s => s.type === "pre")
  const postScripts = scripts.filter(s => s.type === "post")
  const isActive = editing || selectedId !== null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">脚本库</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">管理可复用的前置/后置 JavaScript 脚本，挂载到接口上实现参数处理和数据转换</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-4 rounded-lg border-zinc-200 text-xs font-bold shadow-sm" onClick={() => handleNew("pre")}>
            <Plus className="w-4 h-4 mr-2" /> 前置脚本
          </Button>
          <Button className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95" onClick={() => handleNew("post")}>
            <Plus className="w-4 h-4 mr-2" /> 后置脚本
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Script list */}
        <div className="w-[280px] shrink-0 bg-white border border-zinc-100 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="搜索脚本..."
                className="pl-8 h-8 text-xs border-zinc-200 bg-white"
                value={keyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setKeyword(e.target.value); setPage(1) }}
              />
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-zinc-400 text-xs">加载中...</div>
          ) : scripts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <FileCode2 className="w-10 h-10 text-zinc-200 mb-3" />
              <p className="text-xs text-zinc-400">暂无脚本</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {preScripts.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wide bg-zinc-50/50 border-b border-zinc-100">前置脚本</div>
                  {preScripts.map(s => (
                    <ScriptItem key={s.id} script={s} active={selectedId === s.id} onSelect={() => handleSelect(s)} onDelete={() => handleDelete(s)} />
                  ))}
                </div>
              )}
              {postScripts.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wide bg-zinc-50/50 border-b border-zinc-100">后置脚本</div>
                  {postScripts.map(s => (
                    <ScriptItem key={s.id} script={s} active={selectedId === s.id} onSelect={() => handleSelect(s)} onDelete={() => handleDelete(s)} />
                  ))}
                </div>
              )}
            </div>
          )}
          {(pagination?.total ?? 0) > SIZE && (
            <div className="border-t border-zinc-100">
              <Pager page={page} size={SIZE} total={pagination?.total ?? 0} onPageChange={setPage} />
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          {isActive ? (
            <div className="h-full flex flex-col bg-white border border-zinc-100 rounded-lg shadow-sm overflow-hidden">
              {/* Header */}
              <div className="h-12 border-b border-zinc-100 flex items-center justify-between px-4 bg-zinc-50/20">
                <div className="flex items-center gap-3">
                  <Input className="h-7 w-[200px] text-xs font-bold border-zinc-200 rounded-lg" placeholder="脚本名称" value={formName} onChange={e => setFormName(e.target.value)} />
                  <Badge variant="secondary" className={cn("text-[9px] h-5 px-2 rounded-md", formType === "pre" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600")}>
                    {formType === "pre" ? "前置" : "后置"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSave} disabled={saving} className="h-8 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all active:scale-95">
                    <Save className="w-3 h-3 mr-1.5" /> {saving ? "保存中..." : selectedId ? "更新" : "保存"}
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="px-4 py-2 border-b border-zinc-100 bg-zinc-50/10">
                <Input className="h-7 text-[11px] border-zinc-200 rounded-lg" placeholder="脚本描述（可选）" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
              </div>

              {/* Code editor */}
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="light"
                  value={formCode}
                  onChange={val => setFormCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    padding: { top: 15 },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    renderLineHighlight: "none",
                    tabSize: 2,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-zinc-200 rounded-lg">
              <div className="w-14 h-14 rounded-lg border border-zinc-100 flex items-center justify-center mb-5 bg-zinc-50 shadow-sm">
                <FileCode2 className="w-7 h-7 text-zinc-300" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">选择或创建脚本</h3>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs font-medium">从左侧列表选择脚本编辑，或创建新的前置/后置脚本。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScriptItem({ script, active, onSelect, onDelete }: { script: Script; active: boolean; onSelect: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "px-4 py-3 cursor-pointer transition-all group flex items-center justify-between border-b border-zinc-50",
        active ? "bg-blue-50/50 border-r-2 border-r-blue-600" : "hover:bg-zinc-50/50"
      )}
    >
      <div className="min-w-0">
        <div className={cn("text-xs font-bold truncate tracking-tight", active ? "text-blue-700" : "text-zinc-700 group-hover:text-blue-600")}>
          {script.name}
        </div>
        {script.description && (
          <p className="text-[10px] text-zinc-400 truncate mt-0.5">{script.description}</p>
        )}
      </div>
      <Button variant="ghost" size="icon" className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 shrink-0 ml-2" onClick={e => { e.stopPropagation(); onDelete() }}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  )
}
