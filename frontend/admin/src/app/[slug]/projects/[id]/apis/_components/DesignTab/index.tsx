"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Code2, LayoutTemplate, PenLine, Columns3, Info, Pencil, Folder } from "lucide-react"
import { SqlDesignerModal } from "../SqlDesignerModal"
import { BasicInfoModal } from "../BasicInfoModal"
import { FeedbackBanner } from "./FeedbackBanner"
import { useEndpointFormStore } from "../../_store/useEndpointFormStore"
import { useApiEditorStore } from "../../_store/useApiEditorStore"
import { useReferenceData } from "../../_hooks/useReferenceData"
import { useTenantProject } from "../../_hooks/useTenantProject"
import { useParamSync } from "../../_hooks/useParamSync"
import { useGroupsQuery } from "../../_hooks/useGroupsQuery"

export function DesignTab() {
  const { activeTenant, projectId } = useTenantProject()
  const sql = useEndpointFormStore(s => s.form.sql)
  const method = useEndpointFormStore(s => s.form.method)
  const path = useEndpointFormStore(s => s.form.path)
  const summary = useEndpointFormStore(s => s.form.summary)
  const groupId = useEndpointFormStore(s => s.form.groupId)
  const preScriptId = useEndpointFormStore(s => s.form.preScriptId)
  const postScriptId = useEndpointFormStore(s => s.form.postScriptId)
  const setFormField = useEndpointFormStore(s => s.setFormField)
  const save = useEndpointFormStore(s => s.save)
  const isNew = useApiEditorStore(s => s.isNew)
  const selectedId = useApiEditorStore(s => s.selectedId)
  const { scripts } = useReferenceData(activeTenant)
  const { derivedParamDefs } = useParamSync()
  const { list: groups = [] } = useGroupsQuery(activeTenant, projectId)

  const [designerOpen, setDesignerOpen] = useState(false)
  const [basicInfoOpen, setBasicInfoOpen] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)

  const sqlPreview = sql?.trim() ? sql.trim() : null
  const groupName = groups.find(g => g.id === groupId)?.name

  return (
    <div className="p-6 space-y-4 animate-in fade-in duration-300">
      <FeedbackBanner />

      {/* Basic info card — read-only display */}
      <div className="border border-zinc-200/60 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-zinc-800">基本信息</span>
          </div>
          <button
            onClick={() => setBasicInfoOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-blue-500 hover:text-blue-700 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            编辑
          </button>
        </div>
        <div className="flex divide-x divide-zinc-100">
          <div className="px-5 py-4 flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">请求方式</span>
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider w-fit mt-0.5",
              method === "GET"    ? "bg-blue-50 text-blue-600 border-blue-200"
              : method === "POST"   ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : method === "PUT"    ? "bg-amber-50 text-amber-600 border-amber-200"
              : method === "DELETE" ? "bg-red-50 text-red-600 border-red-200"
              : "bg-zinc-50 text-zinc-500 border-zinc-200"
            )}>
              {method}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">路径</span>
            <span className={cn("text-sm font-mono truncate", path ? "text-zinc-800" : "text-zinc-300 italic")}>
              {path || "未设置"}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">接口名称</span>
            <span className={cn("text-sm truncate", summary ? "text-zinc-700" : "text-zinc-300 italic")}>
              {summary || "未填写"}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">分组</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="text-sm text-zinc-600">{groupName ?? "未分组"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SQL preview card */}
        <div className="lg:col-span-2 border border-zinc-200/60 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-zinc-800">SQL 查询</span>
            </div>
            <Button
              size="sm"
              onClick={() => setDesignerOpen(true)}
              className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 gap-1.5"
            >
              <PenLine className="w-3 h-3" />
              打开 SQL 设计器
            </Button>
          </div>
          <div className="relative min-h-[160px] max-h-[320px] overflow-auto bg-zinc-950 rounded-b-xl">
            {sqlPreview ? (
              <pre className="p-4 text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {sqlPreview}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-[160px] gap-3">
                <Code2 className="w-8 h-8 text-zinc-600" />
                <p className="text-xs text-zinc-500">暂无 SQL — 点击「打开 SQL 设计器」开始编写</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDesignerOpen(true)}
                  className="h-7 text-xs border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <PenLine className="w-3 h-3 mr-1" /> 打开 SQL 设计器
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Params summary card */}
        <div className="border border-zinc-200/60 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-zinc-800">参数</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">
                {derivedParamDefs.length}
              </span>
            </div>
            <button
              onClick={() => setDesignerOpen(true)}
              className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
            >
              编辑
            </button>
          </div>
          <div className="p-4 min-h-[120px]">
            {derivedParamDefs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[100px] gap-2">
                <Columns3 className="w-6 h-6 text-zinc-200" />
                <p className="text-xs text-zinc-400">SQL 中使用 :param 自动提取参数</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {derivedParamDefs.map(def => (
                  <div key={def.name} className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-zinc-50">
                    <span className="text-xs font-mono font-bold text-blue-600 min-w-0 truncate flex-1">{def.name}</span>
                    <span className="text-[10px] text-zinc-400 shrink-0">{def.type || "string"}</span>
                    {def.required && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-red-50 text-red-500 font-bold shrink-0">必填</span>
                    )}
                    {def._isAuto && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-500 shrink-0">自动</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Script selectors */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">脚本</span>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-zinc-400 shrink-0">前置</span>
            <Select value={String(preScriptId)} onValueChange={v => setFormField("preScriptId", Number(v))}>
              <SelectTrigger className="h-7 text-xs border-zinc-200 bg-white rounded-lg min-w-[140px]">
                <SelectValue placeholder="无" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">无</SelectItem>
                {scripts.filter(s => s.type === "pre").map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-zinc-400 shrink-0">后置</span>
            <Select value={String(postScriptId)} onValueChange={v => setFormField("postScriptId", Number(v))}>
              <SelectTrigger className="h-7 text-xs border-zinc-200 bg-white rounded-lg min-w-[140px]">
                <SelectValue placeholder="无" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">无</SelectItem>
                {scripts.filter(s => s.type === "post").map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <SqlDesignerModal open={designerOpen} onClose={() => setDesignerOpen(false)} />

      <BasicInfoModal
        open={basicInfoOpen}
        onClose={() => setBasicInfoOpen(false)}
        mode="edit"
        initialValues={{ method, path, summary, groupId }}
        loading={savingInfo}
        onConfirm={async values => {
          setFormField("method", values.method)
          setFormField("path", values.path)
          setFormField("summary", values.summary)
          setFormField("groupId", values.groupId)
          if (!isNew && selectedId) {
            // Existing endpoint: persist immediately
            setSavingInfo(true)
            const saved = await save(activeTenant, projectId, false, selectedId)
            setSavingInfo(false)
            if (!saved) return  // save failed, toast already shown, keep modal open
          }
          // New endpoint: changes stay in store, user saves via SQL designer
          setBasicInfoOpen(false)
        }}
      />
    </div>
  )
}
