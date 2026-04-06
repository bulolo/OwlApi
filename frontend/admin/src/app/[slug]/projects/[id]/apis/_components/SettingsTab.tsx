"use client"

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Settings2 } from "lucide-react"
import { useEndpointStore } from "../_store/useEndpointStore"

export function SettingsTab() {
  const groupId = useEndpointStore(s => s.form.groupId)
  const preScriptId = useEndpointStore(s => s.form.preScriptId)
  const postScriptId = useEndpointStore(s => s.form.postScriptId)
  const groups = useEndpointStore(s => s.groups)
  const scripts = useEndpointStore(s => s.scripts)
  const setFormField = useEndpointStore(s => s.setFormField)

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <Card className="border-zinc-200/60 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="pb-3 pt-5 px-6 bg-white border-b border-zinc-100">
          <CardTitle className="text-[13px] font-bold text-zinc-800 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-zinc-500" /> 高级配置
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-6 border-b border-zinc-100 bg-zinc-50/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-xs font-bold text-zinc-600">前置注入逻辑（Pre-script）</Label>
              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-3">
                在执行核心 SQL 操作之前允许您通过自定义脚本处理特定的鉴权验证、入参变换或是设置特定的环境变量。
              </p>
              <select
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                value={preScriptId}
                onChange={e => setFormField("preScriptId", Number(e.target.value))}
              >
                <option value={0}>无执行脚本</option>
                {scripts.filter(s => s.type === "pre").map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-bold text-zinc-600">后置处理（Post-script）</Label>
              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-3">
                在得到 SQL 执行结果且返回到客户端之前执行，您可以用来对返回字段进行脱敏、转换嵌套结构或者注入额外业务字段。
              </p>
              <select
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                value={postScriptId}
                onChange={e => setFormField("postScriptId", Number(e.target.value))}
              >
                <option value={0}>无执行脚本</option>
                {scripts.filter(s => s.type === "post").map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
