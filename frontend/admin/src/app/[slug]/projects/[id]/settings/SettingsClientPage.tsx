"use client"

import { useProjectStore } from "@/store/useProjectStore"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Save, AlertCircle, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SettingsClientPage({ projectId }: { projectId: string }) {
  const { projects, dataSources } = useProjectStore()
  const project = projects.find(p => p.id === projectId)

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar Info */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-white border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900">数据源关联</h3>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              将该项目绑定到指定的数据引擎。所有 SQL 查询将通过关联的数据源进行执行。
            </p>
            <div className="mt-4 p-3 bg-blue-50/50 rounded border border-blue-100 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 font-medium leading-normal">
                切换数据库类型时请注意 SQL 语法的兼容性差异。
              </p>
            </div>
          </div>
        </div>

        {/* Selection Area */}
        <div className="md:col-span-8 flex flex-col space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {dataSources.map((ds) => (
              <div
                key={ds.id}
                onClick={() => { }}
                className={cn(
                  "p-4 cursor-pointer border rounded-lg transition-all duration-200 flex items-center justify-between group",
                  project?.dataSourceId === ds.id
                    ? "border-blue-600 bg-blue-50/20 ring-1 ring-blue-600/10"
                    : "bg-white border-zinc-200 hover:border-zinc-300"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "w-9 h-9 rounded flex items-center justify-center border transition-colors",
                    project?.dataSourceId === ds.id ? "bg-blue-600 text-white border-blue-600" : "bg-zinc-50 text-zinc-400 group-hover:bg-zinc-100"
                  )}>
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{ds.name}</p>
                    <p className="text-[11px] text-zinc-400 font-medium">{ds.type} • {ds.dev.host}</p>
                  </div>
                </div>
                {project?.dataSourceId === ds.id && (
                  <div className="flex items-center text-blue-600 font-black text-[10px] uppercase tracking-widest px-3 py-1 bg-blue-50 rounded border border-blue-100 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    已挂载
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-sm group">
              <Save className="w-3.5 h-3.5 mr-2" />
              保存同步配置
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
