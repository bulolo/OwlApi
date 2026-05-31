"use client"

import { useState, useEffect } from "react"
import { loader } from "@monaco-editor/react"
import { useTenant } from "@/providers/TenantProvider"
import { useScripts, useCreateScript, useUpdateScript, useDeleteScript, useScriptBuiltins, useCopyScriptFromBuiltin, usePaginationState } from "@/hooks"
import type { ScriptResp as Script } from "@/lib/sdk"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, FileCode2, Search, ChevronDown, HelpCircle, Library, Check } from "lucide-react"
import { Pager } from "@/components/ui/pager"
import { RefreshButton } from "@/components/ui/refresh-button"
import { showConfirm } from "@/store/useConfirmStore"
import { ScriptItem } from "./_components/ScriptItem"
import { ScriptEditor, ScriptEditorEmpty } from "./_components/ScriptEditor"

const TEMPLATE_PRE = `// 前置脚本 — 在 SQL 执行前处理参数
//
// 输入 params: { "page": "1", "size": "10", "name": "张三", ... }
//   所有值均为字符串（来自请求 JSON Body）
//
// 输出: 返回处理后的 params，供 SQL 中 :变量 替换使用
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
//   分页查询时系统自动注入 params._total（真实总记录数，来自 COUNT(*) 查询）
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
        total: Number(params._total || 0),
      },
    },
    msg: "请求成功",
  };
}
`

export default function ScriptsPage() {
  const activeTenant = useTenant()
  // 预热 Monaco，避免第一次点击脚本才触发懒加载
  useEffect(() => { loader.init() }, [])
  const { page, size, keyword, setPage, setSize, onSearch } = usePaginationState(20)
  const { scripts, pagination, isLoading: loading, refetch } = useScripts(activeTenant, { page, size, keyword })
  const createMutation = useCreateScript(activeTenant)
  const updateMutation = useUpdateScript(activeTenant)
  const deleteMutation = useDeleteScript(activeTenant)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [showBuiltins, setShowBuiltins] = useState(false)

  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<"pre" | "post">("pre")
  const [formCode, setFormCode] = useState("")
  const [formDesc, setFormDesc] = useState("")

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
      // 修改被引用的脚本会影响所有引用它的接口，保存前确认。
      const refs = scripts.find(s => s.id === selectedId)?.ref_count ?? 0
      if (refs > 0 && !await showConfirm(`脚本「${formName}」被 ${refs} 个接口引用，本次修改将应用到所有引用。确定保存？`)) {
        return
      }
      updateMutation.mutate({ id: selectedId, req: payload })
    }
  }

  const handleDelete = async (s: Script) => {
    if (!await showConfirm(`确定删除脚本「${s.name}」？`)) return
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">脚本库</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">管理可复用的前置/后置 JavaScript 脚本，挂载到接口上实现参数处理和数据转换</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="h-9 px-4 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-zinc-100" onClick={() => { setSelectedId(null); setEditing(false) }}>
            <HelpCircle className="w-3.5 h-3.5 mr-1.5" /> 帮助
          </Button>
          <RefreshButton onClick={() => refetch()} />
          <Button variant="outline" className="h-9 px-4 rounded-lg text-xs font-bold" onClick={() => setShowBuiltins(true)}>
            <Library className="w-3.5 h-3.5 mr-1.5" /> 从内置添加
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button suppressHydrationWarning className="h-9 px-4 text-xs font-bold shadow-sm">
                <Plus className="w-4 h-4 mr-1.5" /> 新建 <ChevronDown className="w-3 h-3 ml-1.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px]">
            <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={() => handleNew("pre")}>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 shrink-0" /> 前置脚本
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={() => handleNew("post")}>
              <span className="inline-block w-2 h-2 rounded-full bg-primary/60 mr-2 shrink-0" /> 后置脚本
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Script list */}
        <div className="w-[280px] shrink-0 bg-white border border-border-subtle rounded-lg shadow-card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border-subtle">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索脚本..."
                className="pl-8 h-8 text-xs border-border bg-white"
                value={keyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-xs">加载中...</div>
          ) : scripts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <FileCode2 className="w-10 h-10 text-zinc-300 mb-3" />
              <p className="text-xs text-muted-foreground">暂无脚本</p>
              <p className="text-2xs text-muted-foreground/70 mt-1 mb-4">从内置脚本快速开始，或新建一个</p>
              <Button className="h-8 px-4 text-xs font-bold shadow-sm" onClick={() => setShowBuiltins(true)}>
                <Library className="w-3.5 h-3.5 mr-1.5" /> 从内置添加
              </Button>
              <div className="flex items-center gap-3 mt-3">
                <button className="inline-flex items-center gap-1 text-2xs font-bold text-muted-foreground hover:text-primary" onClick={() => handleNew("pre")}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 新建前置
                </button>
                <button className="inline-flex items-center gap-1 text-2xs font-bold text-muted-foreground hover:text-primary" onClick={() => handleNew("post")}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" /> 新建后置
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {preScripts.length > 0 && (
                <div>
                  <div className="px-4 py-2 flex items-center gap-2 text-2xs font-bold text-muted-foreground uppercase tracking-wide bg-zinc-50 border-b border-border-subtle sticky top-0 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    前置脚本
                    <span className="ml-auto font-bold text-zinc-400">{preScripts.length}</span>
                  </div>
                  {preScripts.map(s => (
                    <ScriptItem key={s.id} script={s} active={selectedId === s.id} onSelect={() => handleSelect(s)} onDelete={() => handleDelete(s)} />
                  ))}
                </div>
              )}
              {postScripts.length > 0 && (
                <div>
                  <div className="px-4 py-2 flex items-center gap-2 text-2xs font-bold text-muted-foreground uppercase tracking-wide bg-zinc-50 border-b border-border-subtle sticky top-0 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                    后置脚本
                    <span className="ml-auto font-bold text-zinc-400">{postScripts.length}</span>
                  </div>
                  {postScripts.map(s => (
                    <ScriptItem key={s.id} script={s} active={selectedId === s.id} onSelect={() => handleSelect(s)} onDelete={() => handleDelete(s)} />
                  ))}
                </div>
              )}
            </div>
          )}
          {(pagination?.total ?? 0) > size && (
            <div className="border-t border-border-subtle">
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

      <BuiltinPickerModal
        open={showBuiltins}
        onClose={() => setShowBuiltins(false)}
        existingNames={new Set(scripts.map(s => s.name))}
      />
    </div>
  )
}

/** 「从内置添加」选择器：列出平台内置脚本，一键复制进当前租户脚本库。 */
function BuiltinPickerModal({
  open,
  onClose,
  existingNames,
}: {
  open: boolean
  onClose: () => void
  existingNames: Set<string>
}) {
  const activeTenant = useTenant()
  const { builtins, isLoading } = useScriptBuiltins(activeTenant, { size: 100 })
  const copyMutation = useCopyScriptFromBuiltin(activeTenant)

  const pre = builtins.filter(s => s.type === "pre")
  const post = builtins.filter(s => s.type === "post")

  const renderRow = (s: Script) => {
    const added = existingNames.has(s.name)
    return (
      <div key={s.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border-subtle hover:bg-zinc-50/60">
        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${s.type === "pre" ? "bg-amber-400" : "bg-primary/60"}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{s.name}</div>
          {s.description && <p className="text-2xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>}
        </div>
        {added ? (
          <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-600 shrink-0 pt-1">
            <Check className="w-3.5 h-3.5" /> 已添加
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs font-bold shrink-0"
            disabled={copyMutation.isPending}
            onClick={() => copyMutation.mutate(s.id)}
          >
            <Plus className="w-3 h-3 mr-1" /> 添加
          </Button>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Library className="w-4 h-4 text-primary" /> 从内置脚本添加
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          平台维护的通用脚本。选择后会<strong className="text-foreground">复制一份</strong>到你的脚本库，可自由修改，不影响平台原件。
        </p>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-1">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">加载中...</div>
          ) : builtins.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">暂无内置脚本</div>
          ) : (
            <>
              {pre.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">前置脚本</div>
                  {pre.map(renderRow)}
                </div>
              )}
              {post.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">后置脚本</div>
                  {post.map(renderRow)}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
