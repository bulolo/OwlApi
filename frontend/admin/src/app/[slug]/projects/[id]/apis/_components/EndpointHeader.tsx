"use client"

import { Button } from "@/components/ui/button"
import { Save, Folder, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { HttpMethod } from "../_types"

export interface EndpointHeaderProps {
  formMethod: HttpMethod
  formPath: string
  groupId: number
  datasourceId: number
  groups: { id?: number; name?: string }[]
  dataSources: { id: number; name: string }[]
  saving: boolean
  isNew: boolean
  onMethodChange: (method: HttpMethod) => void
  onPathChange: (path: string) => void
  onGroupChange: (id: number) => void
  onDatasourceChange: (id: number) => void
  onReset: () => void
  onSave: () => void
}

export function EndpointHeader({
  formMethod, formPath, groupId, datasourceId,
  groups, dataSources, saving, isNew,
  onMethodChange, onPathChange, onGroupChange, onDatasourceChange,
  onReset, onSave,
}: EndpointHeaderProps) {
  return (
    <div className="h-16 border-b border-zinc-100 flex items-center justify-between px-6 bg-white shrink-0">
      <div className="flex-1 flex items-center gap-3 min-w-0 pr-6">
        <Select value={formMethod} onValueChange={v => onMethodChange(v as HttpMethod)}>
          <SelectTrigger className={cn(
            "flex-shrink-0 h-8 w-24 rounded-lg border-2 text-[10px] font-black uppercase tracking-wider",
            formMethod === "GET" ? "bg-blue-50 text-blue-600 border-blue-100"
              : formMethod === "POST" ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : formMethod === "PUT" ? "bg-amber-50 text-amber-600 border-amber-100"
              : formMethod === "DELETE" ? "bg-red-50 text-red-600 border-red-100"
              : "bg-zinc-50 text-zinc-600 border-zinc-200"
          )}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="text"
          value={formPath}
          onChange={e => onPathChange(e.target.value)}
          placeholder="/api/v1/new-endpoint"
          className="flex-1 min-w-0 bg-transparent border-none px-0 py-0 h-full text-base font-bold text-zinc-900 tracking-tight focus:outline-none focus:ring-0 placeholder:text-zinc-300"
        />

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg h-8 px-2.5 transition-colors focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-blue-300">
            <Folder className="w-3.5 h-3.5 text-zinc-400" />
            <Select value={String(groupId)} onValueChange={v => onGroupChange(Number(v))}>
              <SelectTrigger className="h-7 border-none shadow-none bg-transparent text-xs font-bold p-0 min-w-[60px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">未分类</SelectItem>
                {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg h-8 px-2.5 transition-colors focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-blue-300">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <Select value={String(datasourceId)} onValueChange={v => onDatasourceChange(Number(v))}>
              <SelectTrigger className="h-7 border-none shadow-none bg-transparent text-xs font-bold p-0 min-w-[60px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {dataSources.map(ds => <SelectItem key={ds.id} value={String(ds.id)}>{ds.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onReset} className="h-8 px-4 text-xs font-medium text-zinc-500 hover:text-zinc-700 rounded-lg">
          重置
        </Button>
        <Button onClick={onSave} disabled={saving} className="h-8 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 rounded-lg">
          <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? "保存中..." : isNew ? "创建" : "保存"}
        </Button>
      </div>
    </div>
  )
}
