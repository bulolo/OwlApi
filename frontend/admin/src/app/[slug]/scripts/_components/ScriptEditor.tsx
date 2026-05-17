"use client"

import { useRef } from "react"
import { Lock, Save, FileCode2, WrapText, ArrowRight, ArrowLeft, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Editor, { type OnMount } from "@monaco-editor/react"
import type * as MonacoType from "monaco-editor"

interface ScriptEditorProps {
  formName: string
  formType: "pre" | "post"
  formCode: string
  formDesc: string
  selectedId: number | null
  isPlatformSelected: boolean
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
  isPlatformSelected,
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

  const handleFormat = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run()
  }

  return (
    <div className="h-full flex flex-col bg-white border border-border-subtle rounded-lg shadow-card overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-border-subtle flex items-center justify-between px-4 bg-zinc-50/20">
        <div className="flex items-center gap-2">
          {isPlatformSelected && (
            <span className="inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-muted-foreground border border-border shrink-0">
              <Lock className="w-2.5 h-2.5" /> 内置
            </span>
          )}
          <Badge variant="secondary" className={cn("text-2xs h-5 px-2 rounded-md shrink-0", formType === "pre" ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary")}>
            {formType === "pre" ? "前置" : "后置"}
          </Badge>
          <Input
            className="h-7 w-[200px] text-xs font-bold border-border rounded-lg disabled:opacity-70 disabled:cursor-default"
            placeholder="脚本名称"
            value={formName}
            onChange={e => onNameChange(e.target.value)}
            disabled={isPlatformSelected}
          />
        </div>
        <div className="flex items-center gap-2">
          {!isPlatformSelected && (
            <>
              <Button variant="ghost" onClick={handleFormat} className="h-8 px-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-zinc-100">
                <WrapText className="w-3.5 h-3.5 mr-1.5" /> 格式化
              </Button>
              <Button onClick={onSave} disabled={saving} className="h-8 px-4 text-xs font-bold shadow-sm">
                <Save className="w-3 h-3 mr-1.5" /> {saving ? "保存中..." : selectedId ? "更新" : "保存"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-2 border-b border-border-subtle bg-zinc-50/10">
        {isPlatformSelected ? (
          <p className="text-xs text-muted-foreground min-h-[20px]">{formDesc || <span className="italic">暂无描述</span>}</p>
        ) : (
          <Input
            className="h-7 text-xs border-border rounded-lg"
            placeholder="脚本描述（可选）"
            value={formDesc}
            onChange={e => onDescChange(e.target.value)}
          />
        )}
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
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            padding: { top: 15 },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderLineHighlight: "none",
            tabSize: 2,
            readOnly: isPlatformSelected,
            domReadOnly: isPlatformSelected,
          }}
        />
      </div>
    </div>
  )
}

export function ScriptEditorEmpty() {
  return (
    <div className="h-full overflow-auto bg-white border border-border-subtle rounded-lg shadow-card">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border-subtle">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileCode2 className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">脚本库使用指南</h2>
        </div>
        <p className="text-xs text-muted-foreground font-medium ml-10.5">
          脚本挂载在接口上，在 SQL 执行前后对参数和返回数据进行加工处理。函数名必须为 <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">main</code>，支持 ES5 语法。
        </p>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-border-subtle">
        {/* Pre-script */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <h3 className="text-sm font-bold text-foreground">前置脚本</h3>
            <span className="ml-auto text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">SQL 执行前</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            在 SQL 执行前处理请求参数，常用于类型转换、分页计算、参数校验等。
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span><span className="font-bold text-foreground">输入</span>：<code className="font-mono bg-zinc-100 px-1 rounded">params</code> — 请求参数对象，<span className="text-muted-foreground">所有值均为字符串</span></span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span><span className="font-bold text-foreground">输出</span>：处理后的 <code className="font-mono bg-zinc-100 px-1 rounded">params</code>，供 SQL 中 <code className="font-mono bg-zinc-100 px-1 rounded">@变量</code> 替换使用</span>
            </div>
          </div>
          <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 text-2xs font-mono leading-relaxed overflow-x-auto">{`function main(params) {
  // 将 page/size 转换为 limit/offset
  var page = Number(params.page || 1);
  var size = Number(params.size || 10);
  params.limit = String(size);
  params.offset = String((page - 1) * size);
  return params;
}`}</pre>
        </div>

        {/* Post-script */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
            <h3 className="text-sm font-bold text-foreground">后置脚本</h3>
            <span className="ml-auto text-2xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">SQL 执行后</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            在 SQL 执行后加工返回数据，常用于包装响应格式、字段映射、数据聚合等。
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span><span className="font-bold text-foreground">输入</span>：<code className="font-mono bg-zinc-100 px-1 rounded">data</code> — 查询结果数组；<code className="font-mono bg-zinc-100 px-1 rounded">params</code> — 请求参数</span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span><span className="font-bold text-foreground">输出</span>：任意结构，直接作为 API 响应体返回给调用方</span>
            </div>
          </div>
          <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 text-2xs font-mono leading-relaxed overflow-x-auto">{`function main(data, params) {
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
}`}</pre>
        </div>
      </div>

      {/* Rules */}
      <div className="px-6 pb-6">
        <div className="rounded-lg border border-border-subtle bg-zinc-50/50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-widest">使用须知</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            {[
              "函数名必须为 main，否则脚本不会执行",
              "仅支持 ES5 语法，不可使用 import / require",
              "前置脚本必须 return 处理后的 params 对象",
              "后置脚本 return 值即为接口最终响应，不经过二次包装",
              "脚本在接口配置页面单独挂载，一个接口可同时挂载两类",
              "抛出异常时接口返回 500，建议在脚本内做容错处理",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-zinc-300 mt-1.5 shrink-0" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
