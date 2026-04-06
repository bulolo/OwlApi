"use client"

import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Trash2, LayoutTemplate, RotateCcw } from "lucide-react"
import { useEndpointStore } from "../../_store/useEndpointStore"
import { useParamSync } from "../../_hooks/useParamSync"
import type { ParamDef, DerivedParamDef, ParamType } from "../../_types"

export function ParamDefCard() {
  const paramDefs = useEndpointStore(s => s.form.paramDefs)
  const paramInput = useEndpointStore(s => s.form.paramInput)
  const setParamDefs = useEndpointStore(s => s.setParamDefs)
  const setFormField = useEndpointStore(s => s.setFormField)
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

  return (
    <Card className="border-zinc-200/60 shadow-sm overflow-hidden flex flex-col h-[500px] rounded-xl">
      <CardHeader className="pb-3 pt-4 px-5 border-b border-zinc-100 bg-white shrink-0">
        <CardTitle className="text-[13px] font-bold text-zinc-800 flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-blue-500" /> 参数定义
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 flex-1 overflow-auto custom-scrollbar bg-white">
        {derivedParamDefs.map((def) => {
          const isInStore = paramDefs.some(d => d.name === def.name)

          return (
            <div
              key={def.name}
              className={`p-3.5 rounded-xl border ${
                def._isAuto && !isInStore
                  ? "border-dashed border-blue-200 bg-blue-50/30"
                  : "border-zinc-100 bg-zinc-50/30"
              } space-y-2.5 animate-in fade-in slide-in-from-right-2 relative`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-600">{def.name || "未命名"}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-sm ${
                      def._isAuto ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {def._source === "sql" ? "SQL 提取" : def._source === "script" ? "脚本" : "自定义"}
                  </span>
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
                <select
                  className="h-7 text-xs border border-zinc-200 rounded-lg px-2 bg-white outline-none focus:ring-1 ring-blue-500/10"
                  value={def.type || "string"}
                  onChange={e => updateDef(def.name, { type: e.target.value as ParamType })}
                >
                  <option value="string">string</option>
                  <option value="integer">integer</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                </select>
                <div className="flex items-center gap-2 pl-2">
                  <input
                    type="checkbox"
                    className="rounded-sm border-zinc-300 text-blue-600 focus:ring-blue-600"
                    checked={def.required ?? false}
                    onChange={e => updateDef(def.name, { required: e.target.checked })}
                  />
                  <span className="text-[10px] font-bold text-zinc-400">必填</span>
                </div>
              </div>
              <Input
                className="h-7 text-xs border-zinc-200 rounded-lg"
                placeholder="默认值..."
                value={def.default || ""}
                onChange={e => updateDef(def.name, { default: e.target.value })}
              />
              <Input
                className="h-7 text-xs border-zinc-200 rounded-lg"
                placeholder="描述..."
                value={def.desc || ""}
                onChange={e => updateDef(def.name, { desc: e.target.value })}
              />
            </div>
          )
        })}

        <div className="flex gap-2 sticky bottom-0 bg-white pt-2 border-t border-zinc-100 mt-auto">
          <Input
            className="h-8 text-xs border-zinc-200 rounded-lg"
            placeholder="手动新增参数..."
            value={paramInput}
            onChange={e => setFormField("paramInput", e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") addManualParam()
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
