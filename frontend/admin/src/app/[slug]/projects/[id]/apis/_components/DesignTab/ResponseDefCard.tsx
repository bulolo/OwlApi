"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Trash2, ArrowLeft } from "lucide-react"
import { useEndpointFormStore } from "../../_store/useEndpointFormStore"
import type { ResponseDef, ParamType } from "../../_types"

export function ResponseDefCard() {
  const responseDefs = useEndpointFormStore(s => s.form.responseDefs)
  const setResponseDefs = useEndpointFormStore(s => s.setResponseDefs)

  const update = (name: string, patch: Partial<ResponseDef>) => {
    setResponseDefs(responseDefs.map(d => d.name === name ? { ...d, ...patch } : d))
  }

  const remove = (name: string) => {
    setResponseDefs(responseDefs.filter(d => d.name !== name))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border-subtle bg-white shrink-0 flex items-center gap-2">
        <ArrowLeft className="w-3.5 h-3.5 text-primary/80" />
        <span className="text-xs font-bold text-zinc-600">响应字段</span>
        {responseDefs.length > 0 && (
          <span className="ml-auto text-2xs text-muted-foreground">{responseDefs.length} 个字段</span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 pt-2.5 space-y-2.5 bg-white">
        {responseDefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              执行 SQL 后点击<br />「提取响应字段」自动填入
            </p>
          </div>
        ) : (
          responseDefs.map(def => (
            <div
              key={def.name}
              className="p-3.5 rounded-lg border border-border-subtle bg-zinc-50/30 space-y-2.5 animate-in fade-in slide-in-from-right-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-primary truncate">{def.name}</span>
                <button
                  className="text-zinc-300 hover:text-red-500 transition-colors"
                  onClick={() => remove(def.name)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Select value={def.type || "string"} onValueChange={v => update(def.name, { type: v as ParamType })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">string</SelectItem>
                  <SelectItem value="integer">integer</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="boolean">boolean</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="h-7 text-xs border-border rounded-lg"
                placeholder="字段说明..."
                value={def.desc || ""}
                onChange={e => update(def.name, { desc: e.target.value })}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
