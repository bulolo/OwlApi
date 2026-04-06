"use client"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Play, AlignLeft, Code2 } from "lucide-react"
import Editor from "@monaco-editor/react"
import { useEndpointStore } from "../../_store/useEndpointStore"
import { useTenantProject } from "../../_hooks/useTenantProject"
import { QueryPreview } from "./QueryPreview"

export function SqlEditorCard() {
  const { activeTenant, projectId } = useTenantProject()
  const sql = useEndpointStore(s => s.form.sql)
  const setFormField = useEndpointStore(s => s.setFormField)
  const designExecuting = useEndpointStore(s => s.designExecuting)
  const runDesign = useEndpointStore(s => s.runDesign)
  const formatSQL = useEndpointStore(s => s.formatSQL)

  return (
    <Card className="lg:col-span-2 border-zinc-200/60 shadow-sm overflow-hidden flex flex-col h-[500px] rounded-xl">
      <CardHeader className="pb-3 pt-4 px-5 border-b border-zinc-100 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-bold text-zinc-800 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-500" /> SQL 查询
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              onClick={() => runDesign(activeTenant, projectId)}
              disabled={designExecuting}
              size="sm"
              className="h-7 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 text-xs rounded-lg shadow-sm active:scale-95 transition-all"
            >
              {designExecuting ? (
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
              ) : (
                <Play className="w-3 h-3 mr-1" />
              )}
              执行
            </Button>
            <Button onClick={formatSQL} variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-blue-600 rounded-lg">
              <AlignLeft className="w-3 h-3 mr-1" /> 格式化
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative flex flex-col overflow-hidden bg-white">
        <div className="flex-1 relative border-b border-zinc-100">
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme="light"
            value={sql}
            onChange={val => setFormField("sql", val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              padding: { top: 20, bottom: 20 },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderLineHighlight: "none",
              lineHeight: 1.6,
              scrollbar: { vertical: "hidden" },
            }}
          />
        </div>
        <QueryPreview />
      </CardContent>
    </Card>
  )
}
