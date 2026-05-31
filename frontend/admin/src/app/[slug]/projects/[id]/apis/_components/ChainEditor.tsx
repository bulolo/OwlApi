"use client"

import { useState } from "react"
import Editor from "@monaco-editor/react"
import { ChevronUp, ChevronDown, X, Plus, Library, PenLine, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { PHASE_TONE } from "./scriptPhaseTone"
import type { ScriptStep } from "../_types"

interface Script { id?: number; name: string; type: string; code?: string }

const INLINE_TEMPLATE: Record<"pre" | "post", string> = {
  pre: `// 前置脚本 — 处理请求参数（可校验、改写）
function main(params) {
  // 校验示例：return { error: "xxx 不能为空" } 可中断并返回 400
  return params;
}`,
  post: `// 后置脚本 — 处理上一步的数据
// data 为上一段输出（首段为 SQL 行数组），返回值传给下一段 / 作为最终响应
function main(data, params) {
  return data;
}`,
}

interface ChainEditorProps {
  phase: "pre" | "post"
  steps: ScriptStep[]
  /** 全部库脚本（未按类型过滤）。 */
  scripts: Script[]
  onChange: (steps: ScriptStep[]) => void
}

/**
 * 接口脚本「有序链」编辑器（前置 / 后置通用）。
 *   • 每一步：引用库脚本 或 接口内联脚本
 *   • 支持调序、删除；内联步骤可点击编辑（Monaco 弹窗）
 *   • 前置链：params 依次流过；后置链：data 依次流过，包装脚本放链尾
 */
export function ChainEditor({ phase, steps, scripts, onChange }: ChainEditorProps) {
  const [editing, setEditing] = useState<number | null>(null)
  // 新建内联脚本走"草稿"模式：保存前不写入链，避免点了"内联"再取消也把表单标脏。
  const [creatingInline, setCreatingInline] = useState(false)
  const libraryScripts = scripts.filter(s => s.type === phase && s.id != null)
  const tone = PHASE_TONE[phase]

  const move = (i: number, delta: number) => {
    const target = i + delta
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[i], next[target]] = [next[target], next[i]]
    onChange(next)
  }
  const remove = (i: number) => onChange(steps.filter((_, idx) => idx !== i))
  const update = (i: number, patch: Partial<ScriptStep>) =>
    onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const addLibrary = (id: number) => onChange([...steps, { source: "library", scriptId: id }])
  const addInline = () => setCreatingInline(true)

  const stepLabel = (s: ScriptStep): { name: string; missing: boolean } => {
    if (s.source === "inline") return { name: s.name || "内联脚本", missing: false }
    const sc = scripts.find(x => x.id === s.scriptId)
    return { name: sc?.name ?? `#${s.scriptId}（已删除）`, missing: !sc }
  }

  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const { name, missing } = stepLabel(s)
        const isInline = s.source === "inline"
        return (
          <div key={i} className="group flex items-center gap-1 bg-white border border-border rounded-lg pl-2 pr-1 h-8">
            <span className="text-2xs text-muted-foreground tabular-nums w-3.5 shrink-0">{i + 1}</span>
            {/* 颜色编码 phase（橙=前置 / 蓝=后置），图标+文字编码来源（内联 / 库），两者一眼可辨 */}
            <span className={cn(
              "inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 py-0.5 rounded shrink-0 border",
              tone.pill,
            )}>
              {isInline ? <PenLine className="w-2.5 h-2.5" /> : <Library className="w-2.5 h-2.5" />}
              {isInline ? "内联" : "库"}
            </span>
            <span title={name} className={cn("text-xs flex-1 truncate", missing && "text-rose-500")}>{name}</span>
            {/* 控件默认隐藏，hover 时再出现，让名称在静止时占满整行、尽量不截断 */}
            <div className="hidden group-hover:flex items-center shrink-0 bg-white">
              {isInline && (
                <button type="button" onClick={() => setEditing(i)} title="编辑内联脚本"
                  className="p-0.5 text-muted-foreground hover:text-primary">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} title="上移"
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronUp className="w-3 h-3" />
              </button>
              <button type="button" disabled={i === steps.length - 1} onClick={() => move(i, 1)} title="下移"
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronDown className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => remove(i)} title="移除"
                className="p-0.5 text-muted-foreground hover:text-rose-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )
      })}

      {/* 追加步骤：选库脚本 / 新建内联 */}
      <div className="flex items-center gap-2">
        <Select value="" onValueChange={v => addLibrary(Number(v))}>
          <SelectTrigger className="h-7 flex-1 text-xs border-border border-dashed bg-white rounded-lg shadow-none text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Library className="w-3 h-3" /><SelectValue placeholder="引用库脚本" /></span>
          </SelectTrigger>
          <SelectContent>
            {libraryScripts.length === 0
              ? <div className="px-2 py-1.5 text-2xs text-muted-foreground">暂无{phase === "pre" ? "前置" : "后置"}库脚本</div>
              : libraryScripts.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={addInline}
          className="h-7 px-2.5 text-xs gap-1 border-dashed text-muted-foreground shrink-0">
          <Plus className="w-3 h-3" /> 内联
        </Button>
      </div>

      {editing != null && steps[editing]?.source === "inline" && (
        <InlineEditorModal
          step={steps[editing]}
          onClose={() => setEditing(null)}
          onSave={(name, code) => { update(editing, { name, code }); setEditing(null) }}
        />
      )}

      {creatingInline && (
        <InlineEditorModal
          step={{ source: "inline", name: "", code: INLINE_TEMPLATE[phase] }}
          onClose={() => setCreatingInline(false)}
          onSave={(name, code) => {
            onChange([...steps, { source: "inline", name, code }])
            setCreatingInline(false)
          }}
        />
      )}
    </div>
  )
}

function InlineEditorModal({ step, onClose, onSave }: {
  step: ScriptStep
  onClose: () => void
  onSave: (name: string, code: string) => void
}) {
  const [name, setName] = useState(step.name || "")
  const [code, setCode] = useState(step.code || "")
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PenLine className="w-4 h-4 text-violet-600" /> 编辑内联脚本
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="脚本名称（用于展示）" className="h-8 text-sm" />
          <div className="h-[320px] border border-border rounded-lg overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="light"
              value={code}
              onChange={v => setCode(v || "")}
              options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "on", scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: "on" }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="h-8 text-xs">取消</Button>
          <Button onClick={() => onSave(name.trim() || "内联脚本", code)} className="h-8 text-xs">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
