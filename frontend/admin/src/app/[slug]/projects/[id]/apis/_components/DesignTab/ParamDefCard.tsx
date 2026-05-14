"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Trash2, LayoutTemplate, RotateCcw } from "lucide-react"
import { useEndpointFormStore } from "../../_store/useEndpointFormStore"
import { useParamSync } from "../../_hooks/useParamSync"
import type { ParamDef, ParamType } from "../../_types"

export function ParamDefCard({ compact }: { compact?: boolean } = {}) {
  const paramDefs = useEndpointFormStore(s => s.form.paramDefs)
  const paramInput = useEndpointFormStore(s => s.form.paramInput)
  const setParamDefs = useEndpointFormStore(s => s.setParamDefs)
  const setFormField = useEndpointFormStore(s => s.setFormField)
  const { derivedParamDefs } = useParamSync()

  const updateDef = (defName: string, newProps: Partial<ParamDef>) => {
    const originalIndex = paramDefs.findIndex(d => d.name === defName)
    if (originalIndex >= 0) {
      setParamDefs(prev => {
        const arr = [...prev]
        arr[originalIndex] = { ...arr[originalIndex], ...newProps }
        return arr
      })
    } else {
      // 自动检测到的参数，首次编辑时加入
      setParamDefs(prev => [
        ...prev,
        { name: defName, type: "string" as ParamType, required: false, desc: "", default: "", ...newProps },
      ])
    }
  }

  const removeDef = (defName: string) => {
    setParamDefs(prev => prev.filter(d => d.name !== defName))
  }

  const addManualParam = () => {
    const name = paramInput.trim()
    if (!name) return
    setParamDefs(prev => [...prev, { name, type: "string" as ParamType, required: false, desc: "" }])
    setFormField("paramInput", "")
  }

  const paramList = (
    <>
      {derivedParamDefs.map((def) => {
        const isInStore = paramDefs.some(d => d.name === def.name)
        return (
          <div
            key={def.name}
            className={`p-3.5 rounded-lg border ${
              def._isAuto && !isInStore
                ? "border-dashed border-primary/30 bg-primary/10"
                : "border-border-subtle bg-zinc-50/30"
            } space-y-2.5 animate-in fade-in slide-in-from-right-2 relative`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-primary">{def.name || "未命名"}</span>
                {/* 来源 */}
                <span className={`text-2xs px-1.5 py-0.5 rounded-sm ${
                  def._source === "sql"    ? "bg-primary/20 text-primary"
                  : def._source === "script" ? "bg-violet-100 text-violet-600"
                  : "bg-emerald-100 text-emerald-600"
                }`}>
                  {def._source === "sql" ? "SQL" : def._source === "script" ? "脚本" : "手动"}
                </span>
                {/* 必填 / 选填 */}
                <span className={`text-2xs px-1.5 py-0.5 rounded-sm font-bold ${
                  def.required ? "bg-red-50 text-red-500" : "bg-zinc-100 text-muted-foreground"
                }`}>
                  {def.required ? "必填" : "选填"}
                </span>
                {/* 默认值 */}
                {def.default && (
                  <span className="text-2xs px-1.5 py-0.5 rounded-sm bg-zinc-100 text-muted-foreground font-mono">
                    默认: {def.default}
                  </span>
                )}
              </div>
              {isInStore && (
                <button
                  className="text-zinc-300 hover:text-red-500 transition-colors"
                  title={def._isAuto ? "重置该参数设定" : "移除"}
                  onClick={() => removeDef(def.name)}
                >
                  {def._isAuto ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={def.type || "string"} onValueChange={v => updateDef(def.name, { type: v as ParamType })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">string</SelectItem>
                  <SelectItem value="integer">integer</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="boolean">boolean</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 pl-2">
                <input
                  type="checkbox"
                  className="rounded-sm border-border text-primary focus:ring-primary"
                  checked={def.required ?? false}
                  onChange={e => updateDef(def.name, { required: e.target.checked })}
                />
                <span className="text-2xs font-bold text-muted-foreground">必填</span>
              </div>
            </div>
            <Input
              className="h-7 text-xs border-border rounded-lg"
              placeholder="默认值..."
              value={def.default || ""}
              onChange={e => updateDef(def.name, { default: e.target.value })}
            />
            <Input
              className="h-7 text-xs border-border rounded-lg"
              placeholder="描述..."
              value={def.desc || ""}
              onChange={e => updateDef(def.name, { desc: e.target.value })}
            />
          </div>
        )
      })}

      <div className="flex gap-2 sticky bottom-0 bg-white pt-2 border-t border-border-subtle mt-auto">
        <Input
          className="h-8 text-xs border-border rounded-lg"
          placeholder="手动新增参数..."
          value={paramInput}
          onChange={e => setFormField("paramInput", e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") addManualParam()
          }}
        />
      </div>
    </>
  )

  if (compact) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b border-border-subtle bg-white shrink-0 flex items-center gap-2">
          <LayoutTemplate className="w-3.5 h-3.5 text-primary/80" />
          <span className="text-xs font-bold text-zinc-600">参数定义</span>
          {derivedParamDefs.length > 0 && (
            <span className="ml-auto text-2xs text-muted-foreground">{derivedParamDefs.length} 个参数</span>
          )}
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2.5 bg-white">
          {paramList}
        </div>
      </div>
    )
  }

  return (
    <Card className="border-border/60 shadow-card overflow-hidden flex flex-col h-[500px] rounded-lg">
      <CardHeader className="pb-3 pt-4 px-5 border-b border-border-subtle bg-white shrink-0">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-primary/80" /> 参数定义
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 flex-1 overflow-auto custom-scrollbar bg-white">
        {paramList}
      </CardContent>
    </Card>
  )
}
