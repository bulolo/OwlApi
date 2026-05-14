"use client"

import { Lock, Save, FileCode2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Editor from "@monaco-editor/react"

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
  return (
    <div className="h-full flex flex-col bg-white border border-border-subtle rounded-lg shadow-card overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-border-subtle flex items-center justify-between px-4 bg-zinc-50/20">
        <div className="flex items-center gap-3">
          <Input
            className="h-7 w-[200px] text-xs font-bold border-border rounded-lg disabled:opacity-70 disabled:cursor-default"
            placeholder="脚本名称"
            value={formName}
            onChange={e => onNameChange(e.target.value)}
            disabled={isPlatformSelected}
          />
          <Badge variant="secondary" className={cn("text-2xs h-5 px-2 rounded-md", formType === "pre" ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary")}>
            {formType === "pre" ? "前置" : "后置"}
          </Badge>
          {isPlatformSelected && (
            <span className="inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-muted-foreground border border-border">
              <Lock className="w-2.5 h-2.5" /> 内置
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isPlatformSelected && (
            <Button onClick={onSave} disabled={saving} className="h-8 px-4 text-xs font-bold shadow-sm">
              <Save className="w-3 h-3 mr-1.5" /> {saving ? "保存中..." : selectedId ? "更新" : "保存"}
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-2 border-b border-border-subtle bg-zinc-50/10">
        <Input
          className="h-7 text-xs border-border rounded-lg disabled:opacity-70 disabled:cursor-default"
          placeholder="脚本描述（可选）"
          value={formDesc}
          onChange={e => onDescChange(e.target.value)}
          disabled={isPlatformSelected}
        />
      </div>

      {/* Code editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="light"
          value={formCode}
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
    <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-border rounded-lg">
      <div className="w-14 h-14 rounded-lg border border-border-subtle flex items-center justify-center mb-5 bg-zinc-50 shadow-sm">
        <FileCode2 className="w-7 h-7 text-zinc-300" />
      </div>
      <h3 className="text-lg font-bold text-foreground tracking-tight">选择或创建脚本</h3>
      <p className="text-xs text-muted-foreground mt-2 max-w-xs font-medium">从左侧列表选择脚本编辑，或创建新的前置/后置脚本。</p>
    </div>
  )
}
