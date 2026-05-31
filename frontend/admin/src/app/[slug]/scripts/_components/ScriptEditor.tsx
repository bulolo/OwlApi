"use client"

import { useRef, type ReactNode } from "react"
import { Save, FileCode2, WrapText, Info, Wand2, Database, Workflow, Library, PenLine, ChevronRight, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Editor, { type OnMount } from "@monaco-editor/react"
import type * as MonacoType from "monaco-editor"

// ─── schema() auto-generation ─────────────────────────────────────────────────

const MOCK_DATA = [
  { id: 1, name: "mock_value", value: 0, status: "active", created_at: "2024-01-01" },
]
const MOCK_PARAMS = { _total: "100", page: "1", size: "10", limit: "10", offset: "0" }
const MOCK_KEYS_STR = JSON.stringify(Object.keys(MOCK_DATA[0]).sort())

function runWithMock(code: string): unknown {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`
      ${code}
      return typeof main === 'function'
        ? main(${JSON.stringify(MOCK_DATA)}, ${JSON.stringify(MOCK_PARAMS)})
        : null
    `)
    return fn()
  } catch {
    return null
  }
}

function buildSchemaNode(node: unknown): unknown {
  if (Array.isArray(node)) return []
  if (node === null || node === undefined) return {}
  if (typeof node === "object") {
    const nodeKeys = JSON.stringify(Object.keys(node as object).sort())
    if (nodeKeys === MOCK_KEYS_STR) return {}
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node as object)) {
      result[k] = buildSchemaNode(v)
    }
    return result
  }
  if (typeof node === "number") return Number.isInteger(node) ? "integer" : "number"
  if (typeof node === "boolean") return "boolean"
  return "string"
}

function formatSchemaFn(schema: unknown): string {
  return `\nfunction schema() {\n  return ${JSON.stringify(schema)}\n}`
}

function injectSchemaFn(currentCode: string, schemaFnCode: string): string {
  // Replace existing schema() function block if present (handles multiline with dotAll)
  const schemaRe = /\nfunction schema\(\)\s*\{[\s\S]*?\n\}/
  if (schemaRe.test(currentCode)) {
    return currentCode.replace(schemaRe, schemaFnCode)
  }
  return currentCode.trimEnd() + schemaFnCode
}

interface ScriptEditorProps {
  formName: string
  formType: "pre" | "post"
  formCode: string
  formDesc: string
  selectedId: number | null
  saving: boolean
  onNameChange: (name: string) => void
  onDescChange: (desc: string) => void
  onCodeChange: (code: string) => void
  onSave: () => void
}

export function ScriptEditor({
  formName,
  formType,
  formCode,
  formDesc,
  selectedId,
  saving,
  onNameChange,
  onDescChange,
  onCodeChange,
  onSave,
}: ScriptEditorProps) {
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null)

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const handleGenerateSchema = async () => {
    const code = editorRef.current?.getValue() ?? formCode
    const output = runWithMock(code)
    if (output === null) {
      alert("无法执行 main()，请检查脚本语法后重试。")
      return
    }
    const schema = buildSchemaNode(output)
    const injected = injectSchemaFn(code, formatSchemaFn(schema))
    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: injected }),
      })
      if (res.ok) {
        const { formatted } = await res.json()
        editorRef.current?.setValue(formatted)
        onCodeChange(formatted)
        return
      }
    } catch { /* ignore */ }
    editorRef.current?.setValue(injected)
    onCodeChange(injected)
  }

  const handleFormat = async () => {
    const editor = editorRef.current
    if (!editor) return
    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: editor.getValue() }),
      })
      if (!res.ok) return
      const { formatted } = await res.json()
      const pos = editor.getPosition()
      editor.setValue(formatted)
      if (pos) editor.setPosition(pos)
      onCodeChange(formatted)
    } catch {
      // 降级到 Monaco 内置
      editor.getAction("editor.action.formatDocument")?.run()
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border border-border-subtle rounded-lg shadow-card overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-border-subtle flex items-center justify-between px-4 bg-zinc-50/20">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
          <Badge variant="secondary" className={cn("text-2xs h-5 px-2 rounded-md shrink-0", formType === "pre" ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary")}>
            {formType === "pre" ? "前置" : "后置"}
          </Badge>
          <Input
            className="h-7 flex-1 min-w-0 max-w-[360px] text-xs font-bold border-border rounded-lg"
            placeholder="脚本名称"
            value={formName}
            onChange={e => onNameChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={handleFormat} className="h-8 px-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-zinc-100">
            <WrapText className="w-3.5 h-3.5 mr-1.5" /> 格式化
          </Button>
          {formType === "post" && (
            <Button variant="ghost" onClick={handleGenerateSchema} className="h-8 px-3 text-xs font-bold text-primary/80 hover:text-primary hover:bg-primary/5">
              <Wand2 className="w-3.5 h-3.5 mr-1.5" /> 生成 schema()
            </Button>
          )}
          <Button onClick={onSave} disabled={saving} className="h-8 px-4 text-xs font-bold shadow-sm">
            <Save className="w-3 h-3 mr-1.5" /> {saving ? "保存中..." : selectedId ? "更新" : "保存"}
          </Button>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-2 border-b border-border-subtle bg-zinc-50/10">
        <Input
          className="h-7 text-xs border-border rounded-lg"
          placeholder="脚本描述（可选）"
          value={formDesc}
          onChange={e => onDescChange(e.target.value)}
        />
      </div>

      {/* Code editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="light"
          value={formCode}
          onMount={handleMount}
          onChange={val => onCodeChange(val || "")}
          loading={<div className="flex items-center justify-center h-full text-xs text-muted-foreground">编辑器加载中...</div>}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            padding: { top: 15 },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderLineHighlight: "none",
            tabSize: 2,
            wordWrap: "on",
            scrollbar: { horizontal: "hidden" },
          }}
        />
      </div>
    </div>
  )
}

export function ScriptEditorEmpty() {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-white border border-border-subtle rounded-lg shadow-card">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-border-subtle">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileCode2 className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">脚本库使用指南</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          脚本是可复用的处理单元——在接口的 SQL 设计器里编排成有序的「<span className="font-bold text-foreground">前置链</span> / <span className="font-bold text-foreground">后置链</span>」按顺序执行。
        </p>
      </div>

      {/* 链式编排说明 */}
      <div className="px-6 py-4 border-b border-border-subtle bg-zinc-50/40">
        <PipelineDiagram />
      </div>

      {/* 实战：一个接口的完整生命周期，前置 / 后置各一条两步链 */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Workflow className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">实战：「用户列表」接口的一次完整调用</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          把上面的流水线落到一个具体接口，跟着数据看它被逐步加工：两条链各两步，<span className="font-bold text-foreground">专属逻辑（校验、脱敏）内联</span>、<span className="font-bold text-foreground">通用逻辑（分页、包装）引用库</span>。
        </p>
        <pre className="bg-zinc-100 text-zinc-600 rounded-md px-3 py-2 text-2xs font-mono leading-relaxed overflow-x-auto mb-5">{`GET /api/users?page=2&size=10`}</pre>

        {/* 前置链：参数校验 → 分页处理 */}
        <ChainGroup tone="amber" label="前置链" chain="[内联 参数校验] → [库 分页参数处理]" note="params 顺序流过">
          <StepCard n={1} title="请求参数">
            <FlowStage badge="链首 params" tone="zinc" label="调用方传入 + 接口默认值（is_pager 默认 1），合并为字符串 params">
{`{ "page": "2", "size": "10", "is_pager": "1" }`}
            </FlowStage>
          </StepCard>

          <StepCard n={2} kind="inline" title="参数校验">
            <StepCode>{`function main(params) {
  // 分页模式下限制每页条数；is_pager=0（全量）不限制
  if (params.is_pager !== "0" && Number(params.size) > 1000) {
    return { error: { status: 422, message: "size 不能超过 1000" } };
  }
  return params; // 通过则原样返回，交给下一步
}`}</StepCode>
            <div className="flex items-start gap-2 text-2xs leading-relaxed bg-rose-50/50 border border-rose-100 rounded-md px-2.5 py-2">
              <Info className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">校验失败时 <code className="font-mono bg-zinc-100 px-1 rounded">return {`{ error }`}</code> 中断整条链：对象 <code className="font-mono bg-zinc-100 px-1 rounded">{`{ status, message }`}</code> 可自定义状态码，字符串则默认 <code className="font-mono bg-zinc-100 px-1 rounded">400</code>。本例 size=10 校验通过；若 size=2000，调用方收到 <code className="font-mono bg-zinc-100 px-1 rounded">422</code> + <code className="font-mono bg-zinc-100 px-1 rounded">{`{ "code": 1, "msg": "size 不能超过 1000" }`}</code>。</span>
            </div>
            <FlowStage badge="中间结果" tone="violet" label="校验通过，params 原样传给步骤③">
{`{ "page": "2", "size": "10", "is_pager": "1" }`}
            </FlowStage>
          </StepCard>

          <StepCard n={3} kind="library" title="分页参数处理" last>
            <p className="text-2xs text-muted-foreground leading-relaxed">把 page / size 换算成 limit / offset 写入 params（is_pager=0 时不分页，会删除 limit / offset）。</p>
            <StepCode>{`// 前置脚本 — 分页参数处理
// is_pager: "1" 或未传 = 分页；"0" = 不分页
function main(params) {
  var isPager = params.is_pager !== "0";
  if (!isPager) {
    delete params.limit;
    delete params.offset;
    return params;
  }
  var page = Math.max(1, parseInt(params.page, 10) || 1);
  var size = Math.max(1, parseInt(params.size, 10) || 10);
  params.limit = String(size);
  params.offset = String((page - 1) * size);
  return params;
}`}</StepCode>
            <FlowStage badge="交给 SQL" tone="emerald" label="链尾 params，供 SQL 中 :limit / :offset 替换">
{`{ "page": "2", "size": "10", "is_pager": "1", "limit": "10", "offset": "10" }`}
            </FlowStage>
          </StepCard>
        </ChainGroup>

        {/* SQL 执行：连接前置链与后置链 */}
        <div className="my-4">
          <div className="flex items-center gap-2 pl-1">
            <Database className="w-4 h-4 text-zinc-400 shrink-0" />
            <div className="flex-1 border border-dashed border-border rounded-md px-3 py-1.5 bg-zinc-50/60">
              <code className="font-mono text-2xs text-zinc-600">SELECT id, name, email FROM users ORDER BY id LIMIT 10 OFFSET 10</code>
            </div>
            <span className="text-2xs text-muted-foreground shrink-0">网关在数据源执行</span>
          </div>
          <p className="text-2xs text-muted-foreground leading-relaxed mt-2 pl-7">
            分页时（params 含 <code className="font-mono bg-zinc-100 px-1 rounded">limit</code>）网关会额外执行一次去掉 LIMIT 的 <code className="font-mono bg-zinc-100 px-1 rounded">COUNT(*)</code>，把真实总数注入 <code className="font-mono bg-zinc-100 px-1 rounded">params._total</code> 供后置链包装分页结构。
          </p>
          <div className="pl-7 mt-3">
            <FlowStage badge="SQL 结果" tone="zinc" label="网关得到行数组 → 作为后置链链首的 data">
{`[
  { "id": 11, "name": "张三", "email": "zhangsan@example.com" },
  { "id": 12, "name": "李四", "email": "lisi@example.com" }
]`}
            </FlowStage>
          </div>
        </div>

        {/* 后置链：邮箱脱敏 → 分页包装 */}
        <ChainGroup tone="primary" label="后置链" chain="[内联 邮箱脱敏] → [库 标准分页包装]" note="data 顺序流过，包装放链尾">
          <StepCard n={4} kind="inline" title="邮箱脱敏">
            <StepCode>{`function main(data, params) {
  return data.map(function (row) {
    if (row.email) {
      row.email = row.email.replace(/^(.).*(@.*)$/, "$1***$2");
    }
    return row;
  });
}`}</StepCode>
            <FlowStage badge="中间结果" tone="violet" label="步骤④ 的返回值，作为步骤⑤ 的 data 传入">
{`[
  { "id": 11, "name": "张三", "email": "z***@example.com" },
  { "id": 12, "name": "李四", "email": "l***@example.com" }
]`}
            </FlowStage>
          </StepCard>

          <StepCard n={5} kind="library" title="标准分页列表响应" last>
            <p className="text-2xs text-muted-foreground leading-relaxed">把 data 包成 {`{ code, data: { list, pagination }, msg }`} 统一分页结构，total 取自 params._total。</p>
            <StepCode>{`// 后置脚本 — 列表响应包装
// is_pager: "1" 或未传 = 分页；"0" = 不分页
function main(data, params) {
  var isPager = params.is_pager !== "0";
  if (isPager) {
    return {
      code: 0,
      data: {
        list: data,
        pagination: {
          is_pager: 1,
          page: Math.max(1, parseInt(params.page, 10) || 1),
          size: Math.max(1, parseInt(params.size, 10) || 10),
          total: Number(params._total || 0),
        },
      },
      msg: "请求成功",
    };
  }
  return {
    code: 0,
    data: {
      list: data,
      pagination: { is_pager: 0, page: 1, size: data.length, total: data.length },
    },
    msg: "请求成功",
  };
}
function schema() {
  return {
    code: "integer",
    data: {
      list: [],
      pagination: { is_pager: "integer", page: "integer", size: "integer", total: "integer" },
    },
    msg: "string",
  };
}`}</StepCode>
            <p className="text-2xs text-muted-foreground leading-relaxed">附带的 <code className="font-mono bg-zinc-100 px-1 rounded">schema()</code> 不参与执行，仅声明响应结构（值用 <code className="font-mono bg-zinc-100 px-1 rounded">{`"integer" / "string" / []`}</code> 表类型）——网关据此生成接口文档与 SDK 类型，可点编辑器右上角「生成 schema()」自动填充。</p>
            <FlowStage badge="最终响应" tone="emerald" label="链尾返回值 = 接口响应体">
{`{
  "code": 0,
  "data": {
    "list": [ { "id": 11, "name": "张三", "email": "z***@example.com" }, ... ],
    "pagination": { "is_pager": 1, "page": 2, "size": 10, "total": 42 }
  },
  "msg": "请求成功"
}`}
            </FlowStage>
          </StepCard>
        </ChainGroup>
      </div>

      {/* Rules */}
      <div className="px-6 pb-6">
        <div className="rounded-lg border border-border-subtle bg-zinc-50/50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-widest">使用须知</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {RULE_GROUPS.map((g) => (
              <div key={g.label} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", g.dot)} />
                  <span className="text-2xs font-bold text-foreground/70">{g.label}</span>
                </div>
                <div className="space-y-1.5">
                  {g.rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-zinc-300 mt-1.5 shrink-0" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 使用须知 — rules grouped by concern, each with a color marker matching the
// guide's palette (zinc=约束 / primary=链 / rose=错误 / emerald=复用).
const RULE_GROUPS: { label: string; dot: string; rules: string[] }[] = [
  {
    label: "编写约束",
    dot: "bg-zinc-400",
    rules: [
      "函数名必须为 main，否则脚本不会执行",
      "仅支持 ES5 语法，不可使用 import / require",
      "入参：前置脚本 (params)、后置脚本 (data, params)；params 的值均为字符串",
    ],
  },
  {
    label: "链与数据流",
    dot: "bg-primary/60",
    rules: [
      "在 SQL 设计器里编排前置/后置链，每步可「引用库脚本」或「内联编写」",
      "前置链每步 return 处理后的 params，依次传给下一步",
      "后置链每步 return 值传给下一步，最后一步即最终响应（包装放链尾）",
      "后置脚本可定义 schema() 声明响应结构，用于生成接口文档与 SDK 类型",
    ],
  },
  {
    label: "错误处理",
    dot: "bg-rose-400",
    rules: [
      "前置链任意一步 return { error } 可中断请求并返回错误（默认 400）",
      "脚本内 throw 异常视为执行出错，接口统一返回 500",
    ],
  },
  {
    label: "复用建议",
    dot: "bg-emerald-400",
    rules: [
      "通用脚本建在库里复用，接口专属逻辑内联，避免污染脚本库",
    ],
  },
]

const FLOW_TONE = {
  zinc: "bg-zinc-100 text-zinc-600 border-zinc-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
} as const

// FlowStage renders one data snapshot in the worked-example flow.
function FlowStage({ badge, tone, label, children }: {
  badge: string
  tone: keyof typeof FLOW_TONE
  label: string
  children: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={cn("text-2xs font-bold px-2 py-0.5 rounded-full border", FLOW_TONE[tone])}>{badge}</span>
        <span className="text-2xs text-muted-foreground">{label}</span>
      </div>
      <pre className="bg-zinc-100 text-zinc-700 rounded-md px-3 py-2 text-2xs font-mono leading-relaxed overflow-x-auto">{children}</pre>
    </div>
  )
}

// ChainGroup wraps the numbered steps of one chain (前置链 / 后置链) in a card,
// headed by its name, the [step → step] outline and a one-line flow note.
function ChainGroup({ tone, label, chain, note, children }: {
  tone: "amber" | "primary"
  label: string
  chain: string
  note: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-3 py-2 bg-zinc-50/60 border-b border-border-subtle">
        <span className={cn("w-2 h-2 rounded-full shrink-0", tone === "amber" ? "bg-amber-400" : "bg-primary/60")} />
        <span className="text-xs font-bold text-foreground">{label}</span>
        <code className="font-mono text-2xs bg-zinc-100 px-1.5 py-0.5 rounded">{chain}</code>
        <span className="text-2xs text-muted-foreground">{note}</span>
      </div>
      <div className="px-3 py-3">{children}</div>
    </div>
  )
}

// StepCard is one numbered step in a chain: a number rail on the left (with a
// connector line down to the next step) and the step body on the right — an
// 内联/库 source tag, the title, then the authored code / library note and the
// data snapshot the step produces (all passed as children).
function StepCard({ n, kind, title, last, children }: {
  n: number
  kind?: "inline" | "library"
  title: string
  last?: boolean
  children: ReactNode
}) {
  const tag = kind === "inline"
    ? { Icon: PenLine, label: "内联", cls: "bg-violet-50 text-violet-600" }
    : kind === "library"
      ? { Icon: Library, label: "库", cls: "bg-zinc-100 text-muted-foreground" }
      : null
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <span className="w-5 h-5 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center">{n}</span>
        {!last && <span className="w-px flex-1 bg-border-subtle mt-1" />}
      </div>
      <div className={cn("flex-1 min-w-0", last ? "" : "pb-4")}>
        <div className="flex items-center gap-1.5 mb-1.5">
          {tag && (
            <span className={cn("inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 py-0.5 rounded shrink-0", tag.cls)}>
              <tag.Icon className="w-2.5 h-2.5" />
              {tag.label}
            </span>
          )}
          <span className="text-xs font-bold text-foreground">{title}</span>
        </div>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  )
}

// StepCode renders the inline script a user authors on the endpoint.
function StepCode({ children }: { children: string }) {
  return (
    <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-3 text-2xs font-mono leading-relaxed overflow-x-auto">{children}</pre>
  )
}

// PipelineDiagram is the bird's-eye view of one request's lifecycle —
// 请求 → 前置链 → SQL → 后置链 → 响应 — color-coded to match the worked example below.
function PipelineDiagram() {
  return (
    <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
      <PipeEndpoint label="请求" sub="params 入口" tone="zinc" />
      <PipeChevron delay={0} />
      <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="text-sm font-bold text-foreground">前置链</span>
          <span className="text-xs text-amber-700/80">· 加工 params</span>
        </div>
        <div className="flex items-center gap-1.5">
          <PipeStep tone="amber">参数校验</PipeStep>
          <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 animate-pipe-flow motion-reduce:animate-none" style={{ animationDelay: "0.15s" }} />
          <PipeStep tone="amber">分页处理</PipeStep>
        </div>
      </div>
      <PipeChevron delay={0.3} />
      <div className="shrink-0 self-stretch flex flex-col justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Database className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-bold text-foreground">SQL</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">数据源执行</div>
      </div>
      <PipeChevron delay={0.45} />
      <div className="shrink-0 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
          <span className="text-sm font-bold text-foreground">后置链</span>
          <span className="text-xs text-primary/80">· 加工 data</span>
        </div>
        <div className="flex items-center gap-1.5">
          <PipeStep tone="primary">数据处理</PipeStep>
          <ArrowRight className="w-4 h-4 text-primary/50 shrink-0 animate-pipe-flow motion-reduce:animate-none" style={{ animationDelay: "0.6s" }} />
          <PipeStep tone="primary">响应包装</PipeStep>
        </div>
      </div>
      <PipeChevron delay={0.75} />
      <PipeEndpoint label="响应" sub="响应体" tone="emerald" />
    </div>
  )
}

const PIPE_ENDPOINT = {
  zinc: "border-zinc-200 bg-white",
  emerald: "border-emerald-200 bg-emerald-50/40",
} as const

// PipeEndpoint is a terminal node of the pipeline (请求 / 响应).
function PipeEndpoint({ label, sub, tone }: { label: string; sub: string; tone: keyof typeof PIPE_ENDPOINT }) {
  return (
    <div className={cn("shrink-0 self-stretch flex flex-col justify-center rounded-xl border px-4 py-3 text-center", PIPE_ENDPOINT[tone])}>
      <div className="text-sm font-bold text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  )
}

// PipeStep is one named step chip inside a chain box.
function PipeStep({ tone, children }: { tone: "amber" | "primary"; children: ReactNode }) {
  return (
    <span className={cn(
      "text-xs bg-white rounded-md px-2 py-1 text-foreground whitespace-nowrap border",
      tone === "amber" ? "border-amber-200" : "border-primary/20",
    )}>{children}</span>
  )
}

// PipeChevron is a connector between pipeline stages; the staggered fade+slide
// (delay increases left→right) gives the sense of data flowing down the pipe.
function PipeChevron({ delay = 0 }: { delay?: number }) {
  return (
    <ChevronRight
      className="w-5 h-5 text-muted-foreground shrink-0 animate-pipe-flow motion-reduce:animate-none"
      style={{ animationDelay: `${delay}s` }}
    />
  )
}
