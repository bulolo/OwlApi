"use client"

import { useState } from "react"
import { Loader2, Code2, CheckCircle2, Download, Rocket, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { exportOpenApi } from "@/lib/sdk"
import type { EnvironmentResp } from "@/lib/sdk"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { envColor } from "../_utils/envColor"
import { useSdkPublish } from "@/ee/sdk-publish/hooks/useSdkPublish"
import { SdkPublishModalTab } from "@/ee/sdk-publish/SdkPublishModalTab"
import { SdkPublishConfigForm } from "@/ee/sdk-publish/SdkPublishConfigForm"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  projectId: number
  envs: EnvironmentResp[]
}

interface LangOption {
  id: string
  label: string
  sublabel: string
  color: string
}

const LANGUAGES: LangOption[] = [
  { id: "typescript-fetch", label: "TypeScript", sublabel: "Fetch",    color: "bg-blue-500" },
  { id: "typescript-axios", label: "TypeScript", sublabel: "Axios",    color: "bg-blue-400" },
  { id: "javascript",       label: "JavaScript", sublabel: "ES6",      color: "bg-yellow-400" },
  { id: "python",           label: "Python",     sublabel: "requests", color: "bg-green-500" },
  { id: "go",               label: "Go",         sublabel: "net/http", color: "bg-cyan-500" },
  { id: "java",             label: "Java",       sublabel: "OkHttp",   color: "bg-orange-500" },
  { id: "php",              label: "PHP",        sublabel: "Guzzle",   color: "bg-indigo-500" },
  { id: "swift5",           label: "Swift",      sublabel: "URLSession", color: "bg-red-500" },
]

type TabKey = "download" | "publish" | "config"

export function SdkModal({ open, onOpenChange, slug, projectId, envs }: Props) {
  const { canPublish } = useSdkPublish(projectId)
  const [tab, setTab] = useState<TabKey>("download")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 rounded-xl overflow-hidden",
        canPublish ? "sm:max-w-[600px]" : "sm:max-w-[520px]"
      )}>
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border-subtle">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            客户端 SDK
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            基于所选环境已发版的接口，生成并下载或发布 SDK
          </p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as TabKey)} className="pt-3">
          <TabsList className="h-9 bg-zinc-50 mx-6">
            <TabsTrigger value="download" className="text-xs font-bold gap-1.5">
              <Download className="w-3.5 h-3.5" />下载 ZIP
            </TabsTrigger>
            {canPublish && (
              <TabsTrigger value="publish" className="text-xs font-bold gap-1.5">
                <Rocket className="w-3.5 h-3.5" />发布到 GitLab
              </TabsTrigger>
            )}
            {canPublish && (
              <TabsTrigger value="config" className="text-xs font-bold gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />配置
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="download" className="px-6 pt-3 pb-6">
            <DownloadTab
              slug={slug}
              projectId={projectId}
              envs={envs}
              onDone={() => onOpenChange(false)}
            />
          </TabsContent>

          {canPublish && (
            <TabsContent value="publish" className="px-6 pt-3 pb-6">
              <SdkPublishModalTab
                projectId={projectId}
                envs={envs}
                onGoToConfig={() => setTab("config")}
              />
            </TabsContent>
          )}

          {canPublish && (
            <TabsContent
              value="config"
              className="max-h-[60vh] overflow-y-auto"
            >
              {/* 内边距放在内层 div，让 scrollbar 贴到 dialog 边缘而不是悬在 padding 里 */}
              <div className="px-6 pt-3 pb-6">
                <SdkPublishConfigForm projectId={projectId} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// 下载流程：保持原有逻辑，仅抽成子组件。
function DownloadTab({
  slug, projectId, envs, onDone,
}: { slug: string; projectId: number; envs: EnvironmentResp[]; onDone: () => void }) {
  const [selectedLang, setSelectedLang] = useState<string>("typescript-fetch")
  const [selectedEnv, setSelectedEnv] = useState<string>(() => envs[0]?.name ?? "")
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    if (!selectedEnv) {
      toast.error("请先选择环境")
      return
    }
    setLoading(true)
    try {
      const spec = await exportOpenApi(slug, projectId, { env: selectedEnv }) as Record<string, unknown>

      const genRes = await fetch(
        `https://api.openapi-generator.tech/api/gen/clients/${selectedLang}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec }),
        }
      )
      if (!genRes.ok) throw new Error(`生成器返回 ${genRes.status}`)
      const { link } = await genRes.json() as { link: string }

      const a = document.createElement("a")
      a.href = link
      a.download = `sdk-${selectedEnv}-${selectedLang}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast.success("SDK 下载已开始")
      onDone()
    } catch (err) {
      toast.error("生成失败：" + (err instanceof Error ? err.message : "未知错误"))
    } finally {
      setLoading(false)
    }
  }

  const lang = LANGUAGES.find(l => l.id === selectedLang)

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold text-zinc-600 mb-3">选择环境</div>
        <div className="flex gap-2 flex-wrap">
          {envs.map(env => {
            const ec = envColor(env.name)
            const isSelected = selectedEnv === env.name
            return (
              <button
                key={env.id}
                onClick={() => setSelectedEnv(env.name)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border-subtle bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-white"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", ec.bg)} />
                {env.name}
                {isSelected && <CheckCircle2 className="w-3 h-3" />}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-zinc-600 mb-3">选择语言</div>
        <div className="grid grid-cols-4 gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.id}
              onClick={() => setSelectedLang(l.id)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all",
                selectedLang === l.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border-subtle bg-zinc-50 hover:border-zinc-300 hover:bg-white"
              )}
            >
              {selectedLang === l.id && (
                <CheckCircle2 className="absolute top-1.5 right-1.5 w-3 h-3 text-primary" />
              )}
              <span className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-black", l.color)}>
                {l.label[0]}
              </span>
              <div>
                <div className="text-2xs font-bold text-zinc-700 leading-tight">{l.label}</div>
                <div className="text-2xs text-muted-foreground leading-tight">{l.sublabel}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {lang && selectedEnv && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-50 rounded-lg border border-border-subtle text-xs text-muted-foreground">
          <span className={cn("w-5 h-5 rounded flex items-center justify-center text-white text-2xs font-black flex-shrink-0", lang.color)}>
            {lang.label[0]}
          </span>
          <span>
            基于 <span className="font-bold text-zinc-700">{selectedEnv}</span> 环境已发版接口，
            生成 <span className="font-bold text-zinc-700">{lang.label} ({lang.sublabel})</span> SDK
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleDownload} disabled={loading || !selectedEnv} className="min-w-[100px]">
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />生成中…</>
          ) : (
            "生成并下载"
          )}
        </Button>
      </div>
    </div>
  )
}
