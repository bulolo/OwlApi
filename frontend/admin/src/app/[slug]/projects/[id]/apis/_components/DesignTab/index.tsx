"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Code2, LayoutTemplate, PenLine, Columns3, Info, Pencil, Folder, Library } from "lucide-react"
import { SqlDesignerModal } from "../SqlDesignerModal"
import { BasicInfoModal } from "../BasicInfoModal"
import { ScriptPreviewModal, type PreviewScript } from "../ScriptPreviewModal"
import { PHASE_TONE } from "../scriptPhaseTone"
import { FeedbackBanner } from "./FeedbackBanner"
import { RestoredBanner } from "./RestoredBanner"
import { DraftStatusBanner } from "./DraftStatusBanner"
import { useEndpointFormStore } from "../../_store/useEndpointFormStore"
import { useApiEditorStore } from "../../_store/useApiEditorStore"
import { useReferenceData } from "../../_hooks/useReferenceData"
import { useTenantProject } from "../../_hooks/useTenantProject"
import { useParamSync } from "../../_hooks/useParamSync"
import { useGroupsQuery } from "../../_hooks/useGroupsQuery"
import type { DerivedParamDef, ScriptStep } from "../../_types"

export function DesignTab() {
  const { activeTenant, projectId } = useTenantProject()
  const sql = useEndpointFormStore(s => s.form.sql)
  const method = useEndpointFormStore(s => s.form.method)
  const path = useEndpointFormStore(s => s.form.path)
  const summary = useEndpointFormStore(s => s.form.summary)
  const groupId = useEndpointFormStore(s => s.form.groupId)
  const preScripts = useEndpointFormStore(s => s.form.preScripts)
  const postScripts = useEndpointFormStore(s => s.form.postScripts)
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
  const [previewScript, setPreviewScript] = useState<PreviewScript | null>(null)

  const sqlPreview = sql?.trim() ? sql.trim() : null
  const groupName = groups.find(g => g.id === groupId)?.name

  return (
    <div className="p-6 space-y-4 animate-in fade-in duration-300">
      <RestoredBanner />
      <FeedbackBanner />
      <DraftStatusBanner />

      {/* Basic info card — read-only display */}
      <div className="border border-border/60 rounded-xl bg-white shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary/80" />
            <span className="text-sm font-bold text-foreground">基本信息</span>
          </div>
          <button
            onClick={() => setBasicInfoOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary/90 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            编辑
          </button>
        </div>
        <div className="flex divide-x divide-zinc-100">
          <div className="px-5 py-4 flex flex-col gap-1 shrink-0">
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">请求方式</span>
            <span className={cn(
              "text-2xs font-black px-2 py-0.5 rounded-md border uppercase tracking-wider w-fit mt-0.5",
              method === "GET"    ? "bg-primary/10 text-primary border-primary/30"
              : method === "POST"   ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : method === "PUT"    ? "bg-amber-50 text-amber-600 border-amber-200"
              : method === "DELETE" ? "bg-red-50 text-red-600 border-red-200"
              : "bg-zinc-50 text-muted-foreground border-border"
            )}>
              {method}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">路径</span>
            <span className={cn("text-sm font-mono truncate", path ? "text-foreground" : "text-zinc-300 italic")}>
              {path || "未设置"}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">接口名称</span>
            <span className={cn("text-sm truncate", summary ? "text-zinc-700" : "text-zinc-300 italic")}>
              {summary || "未填写"}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-1 shrink-0">
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">分组</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-zinc-600">{groupName ?? "未分组"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SQL preview card */}
        <div className="lg:col-span-2 border border-border/60 rounded-xl bg-white shadow-card overflow-hidden">
          <div className="border-b border-border-subtle">
            <div className="flex items-center justify-between px-5 py-3 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Code2 className="w-4 h-4 text-primary/80 shrink-0" />
                <span className="text-sm font-bold text-foreground">SQL 查询</span>
              </div>
              <Button
                size="sm"
                onClick={() => setDesignerOpen(true)}
                className="h-7 text-xs px-3 gap-1.5 shrink-0"
              >
                <PenLine className="w-3 h-3" />
                打开 SQL 设计器
              </Button>
            </div>
            {/* 脚本链只读展示——点击查看内容，挂载/切换/编辑统一到 SQL 设计器内 */}
            <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
              <ChainPills label="前置" phase="pre" steps={preScripts} scripts={scripts} onPreview={setPreviewScript} />
              <ChainPills label="后置" phase="post" steps={postScripts} scripts={scripts} onPreview={setPreviewScript} />
            </div>
          </div>
          <div className="relative min-h-[160px] max-h-[320px] overflow-auto bg-zinc-950 rounded-b-xl">
            {sqlPreview ? (
              <pre className="p-4 text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {sqlPreview}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-[160px] gap-3">
                <Code2 className="w-8 h-8 text-zinc-600" />
                <p className="text-xs text-muted-foreground">暂无 SQL — 点击「打开 SQL 设计器」开始编写</p>
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
        <div className="border border-border/60 rounded-xl bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-primary/80" />
              <span className="text-sm font-bold text-foreground">参数</span>
              <span className="text-2xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {derivedParamDefs.length}
              </span>
            </div>
            <button
              onClick={() => setDesignerOpen(true)}
              className="text-2xs text-primary/80 hover:text-primary/90 font-medium"
            >
              编辑
            </button>
          </div>
          <div className="p-4 min-h-[120px]">
            {derivedParamDefs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[100px] gap-2">
                <Columns3 className="w-6 h-6 text-zinc-200" />
                <p className="text-xs text-muted-foreground">SQL 中使用 :param 自动提取参数</p>
              </div>
            ) : (
              <ParamSummaryGroups path={path} method={method} derivedParamDefs={derivedParamDefs} />
            )}
          </div>
        </div>
      </div>

      <SqlDesignerModal open={designerOpen} onClose={() => setDesignerOpen(false)} />

      <ScriptPreviewModal
        open={!!previewScript}
        script={previewScript}
        onClose={() => setPreviewScript(null)}
        onEditInDesigner={() => {
          setPreviewScript(null)
          setDesignerOpen(true)
        }}
      />

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

// ── Param summary helpers ─────────────────────────────────────────────────────

function extractPathParamNames(path: string): Set<string> {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? []
  return new Set(matches.map(m => m.slice(1)))
}

function ParamSummaryGroups({ path, method, derivedParamDefs }: {
  path: string
  method: string
  derivedParamDefs: DerivedParamDef[]
}) {
  const pathNames = extractPathParamNames(path)
  const isQueryMethod = method === "GET" || method === "DELETE"
  const pathParams = derivedParamDefs.filter(d => pathNames.has(d.name))
  const otherParams = derivedParamDefs.filter(d => !pathNames.has(d.name))

  return (
    <div className="space-y-3">
      {pathParams.length > 0 && (
        <ParamGroup label="Path" color="green" params={pathParams} />
      )}
      {otherParams.length > 0 && (
        <ParamGroup label={isQueryMethod ? "Query" : "Body"} color="blue" params={otherParams} />
      )}
    </div>
  )
}

const sourceStyle: Record<string, string> = {
  sql:    "bg-primary/20 text-primary",
  script: "bg-violet-100 text-violet-600",
  manual: "bg-emerald-100 text-emerald-600",
}
const sourceLabel: Record<string, string> = {
  sql:    "SQL",
  script: "脚本",
  manual: "手动",
}

function ParamGroup({ label, color, params }: {
  label: string
  color: "green" | "blue"
  params: DerivedParamDef[]
}) {
  const barCls = color === "green" ? "bg-emerald-400" : "bg-primary/60"
  const tagCls = color === "green"
    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
    : "bg-primary/10 text-primary border-primary/30"
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={cn("w-1 h-3 rounded-full shrink-0", barCls)} />
        <span className={cn("text-2xs font-bold px-1.5 py-0.5 rounded border", tagCls)}>{label}</span>
      </div>
      {params.map(def => (
        <div key={def.name} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-2 py-1 px-2 rounded-md hover:bg-zinc-50">
          <span className="text-xs font-mono font-bold text-primary truncate">{def.name}</span>
          <span className="text-2xs text-muted-foreground shrink-0 w-12 text-right">{def.type || "string"}</span>
          <span className={cn("text-2xs px-1 py-0.5 rounded shrink-0 text-center w-8", sourceStyle[def._source ?? "manual"])}>
            {sourceLabel[def._source ?? "manual"]}
          </span>
          <span className={cn("text-2xs px-1 py-0.5 rounded font-bold shrink-0 text-center w-8",
            def.required ? "bg-red-50 text-red-500" : "bg-zinc-100 text-muted-foreground"
          )}>
            {def.required ? "必填" : "选填"}
          </span>
          <span className="text-2xs font-mono text-muted-foreground shrink-0 w-12 truncate text-right">
            {def.default || ""}
          </span>
        </div>
      ))}
    </div>
  )
}

// ChainPills renders a read-only summary of a pre/post chain as a row of pills.
// Pill color follows the phase (前置=橙 / 后置=蓝), matching the script library;
// the inline-vs-library distinction is carried by the leading icon, not color.
// Both library and inline steps are clickable — they open the preview modal
// showing the script code. A deleted library step (name missing) is shown in
// red and is not clickable. An empty chain renders a single muted placeholder.
function ChainPills({ label, phase, steps, scripts, onPreview }: {
  label: string
  phase: "pre" | "post"
  steps: ScriptStep[]
  scripts: { id?: number; name?: string; description?: string; code?: string }[]
  onPreview?: (s: PreviewScript) => void
}) {
  const tone = PHASE_TONE[phase]
  if (steps.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded border bg-zinc-50 text-zinc-300 italic border-border-subtle">
        <span className="font-bold text-muted-foreground">{label}</span>
        <span>—</span>
      </span>
    )
  }
  return (
    <>
      {steps.map((s, i) => {
        const prefix = steps.length > 1 ? `${label} ${i + 1}` : label
        if (s.source === "inline") {
          const name = s.name || "内联"
          return (
            <button key={i} type="button"
              onClick={() => onPreview?.({ name, type: phase, source: "inline", code: s.code })}
              title={`${label}内联：${name} — 点击查看`}
              className={cn(
                "inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded border max-w-[180px] truncate transition-colors cursor-pointer",
                tone.pill, tone.pillHover,
              )}>
              <PenLine className="w-2.5 h-2.5 shrink-0 opacity-70" />
              <span className="font-bold opacity-80">{prefix}</span>
              <span className="truncate">{name}</span>
            </button>
          )
        }
        const sc = scripts.find(x => x.id === s.scriptId)
        return (
          <button key={i} type="button"
            disabled={!sc}
            onClick={() => sc && onPreview?.({ name: sc.name ?? "", type: phase, source: "library", description: sc.description, code: sc.code })}
            title={sc ? `${label}库脚本：${sc.name} — 点击查看` : `${label}库脚本 #${s.scriptId} 已删除`}
            className={cn(
              "inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded border max-w-[180px] truncate transition-colors",
              sc ? cn(tone.pill, tone.pillHover, "cursor-pointer") : "bg-rose-50 text-rose-600 border-rose-200 cursor-not-allowed",
            )}>
            <Library className="w-2.5 h-2.5 shrink-0 opacity-70" />
            <span className="font-bold opacity-80">{prefix}</span>
            <span className="truncate">{sc?.name ?? `#${s.scriptId}（已删除）`}</span>
          </button>
        )
      })}
    </>
  )
}
