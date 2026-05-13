"use client"

import { useState } from "react"
import { useTenant } from "@/providers/TenantProvider"
import { useScripts, useCreateScript, useUpdateScript, useDeleteScript } from "@/hooks"
import type { Script } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, FileCode2, Search, ChevronDown, RefreshCw } from "lucide-react"
import { Pager } from "@/components/ui/pager"
import { showConfirm } from "@/store/useConfirmStore"
import { ScriptItem } from "./_components/ScriptItem"
import { ScriptEditor, ScriptEditorEmpty } from "./_components/ScriptEditor"

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
  const activeTenant = useTenant()
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const { scripts, pagination, isLoading: loading, refetch } = useScripts(activeTenant, { page, size, keyword })
  const createMutation = useCreateScript(activeTenant)
  const updateMutation = useUpdateScript(activeTenant)
  const deleteMutation = useDeleteScript(activeTenant)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)

  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<"pre" | "post">("pre")
  const [formCode, setFormCode] = useState("")
  const [formDesc, setFormDesc] = useState("")

  const selectedScript = scripts.find(s => s.id === selectedId) ?? null

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

  const handleDelete = async (s: Script) => {
    if (s.is_platform) return
    if (!await showConfirm(`确定删除脚本「${s.name}」？`)) return
    deleteMutation.mutate(s.id, {
      onSuccess: () => { if (selectedId === s.id) { setSelectedId(null); setEditing(false) } },
    })
  }

  const isPlatformSelected = !editing && selectedScript?.is_platform === true

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
          <Button variant="ghost" className="h-9 px-4 rounded-lg text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 刷新
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95">
                <Plus className="w-4 h-4 mr-1.5" /> 新建 <ChevronDown className="w-3 h-3 ml-1.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px]">
            <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={() => handleNew("pre")}>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 shrink-0" /> 前置脚本
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={() => handleNew("post")}>
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2 shrink-0" /> 后置脚本
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
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
              <FileCode2 className="w-10 h-10 text-zinc-300 mb-3" />
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
          {(pagination?.total ?? 0) > size && (
            <div className="border-t border-zinc-100">
              <Pager page={page} size={size} total={pagination?.total ?? 0} onPageChange={setPage} onSizeChange={setSize} />
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          {isActive ? (
            <ScriptEditor
              formName={formName}
              formType={formType}
              formCode={formCode}
              formDesc={formDesc}
              selectedId={selectedId}
              isPlatformSelected={isPlatformSelected}
              saving={saving}
              onNameChange={setFormName}
              onDescChange={setFormDesc}
              onCodeChange={setFormCode}
              onSave={handleSave}
            />
          ) : (
            <ScriptEditorEmpty />
          )}
        </div>
      </div>
    </div>
  )
}
