"use client"

import { useState } from "react"
import { useTenant } from "@/providers/TenantProvider"
import { Box, ArrowLeft, Download, ChevronRight, Layers, Settings2 } from "lucide-react"
import { useProject, useEnvironments } from "@/hooks"
import { apiExportOpenAPI } from "@/lib/api-client"
import { useEndpointsQuery } from "./apis/_hooks/useEndpointsQuery"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { envColor } from "./_utils/envColor"

export default function ProjectLayout({
  children,
  projectId,
}: {
  children: React.ReactNode
  projectId: string
}) {
  const activeTenant = useTenant()
  const { data: project } = useProject(activeTenant, Number(projectId))
  const { data: epData } = useEndpointsQuery(activeTenant, projectId)
  const { data: envs = [] } = useEnvironments(activeTenant, Number(projectId))
  const endpointCount = epData?.list?.length ?? 0
  const [exporting, setExporting] = useState(false)

  const handleExport = async (envName: string) => {
    setExporting(true)
    try {
      await apiExportOpenAPI(activeTenant, Number(projectId), envName)
    } catch (err: unknown) {
      toast.error("导出失败: " + (err instanceof Error ? err.message : "未知错误"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-5">
        <Link href={`/${activeTenant}/projects`} className="hover:text-primary transition-colors">
          项目列表
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-600 font-bold">{project?.name || "加载中..."}</span>
      </div>

      {/* Project Header */}
      <div className="bg-white border border-border-subtle rounded-lg shadow-card mb-6">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${activeTenant}/projects`}>
              <Button variant="ghost" size="icon" className="rounded-lg hover:bg-zinc-100">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Link>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center border shadow-sm text-primary border-primary/20 bg-primary/10">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-bold text-foreground tracking-tight">
                    {project?.name || "加载中..."}
                  </h1>
                  <Badge variant="secondary" className="bg-zinc-100 text-muted-foreground border-border text-2xs font-bold px-2 py-0.5 rounded-md">
                    ID:{projectId}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  {project?.description || "SQL to API 接口编排"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-2 px-4 py-2 bg-zinc-50 rounded-lg border border-border-subtle">
              <Layers className="w-4 h-4 text-primary/80" />
              <span className="text-xs font-bold text-zinc-600">{endpointCount}</span>
              <span className="text-xs text-muted-foreground">个接口</span>
            </div>

            {/* 环境清单——展示型，不是"切换"。链接到 Environments 管理页。
                这里把"项目里有哪些 env"摊开摆着，让用户看清不再有"工作区"切换的语义。 */}
            {envs.length > 0 && (
              <Link
                href={`/${activeTenant}/projects/${projectId}/environments`}
                className="hidden lg:inline-flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg border border-border-subtle hover:bg-zinc-100 transition-colors"
                title="管理环境"
              >
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="flex items-center gap-2.5">
                  {envs.map(e => (
                    <span key={e.id} className="inline-flex items-center gap-1 text-2xs font-bold tracking-wide">
                      <span className={cn("w-1.5 h-1.5 rounded-full", envColor(e.name).bg)} />
                      {e.name}
                    </span>
                  ))}
                </div>
              </Link>
            )}

            {/* 导出 OpenAPI 现在自带 env 选择，因为不同 env 的 active version 不同。 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={exporting || envs.length === 0}
                  className="h-9 px-4 rounded-lg border-border text-xs font-bold shadow-sm hover:bg-zinc-50 hover:border-border transition-all"
                >
                  <Download className="w-3.5 h-3.5 mr-2" /> 导出 OpenAPI
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-lg shadow-modal border-border p-1">
                {envs.map(env => (
                  <DropdownMenuItem
                    key={env.id}
                    onClick={() => handleExport(env.name)}
                    className="text-xs font-bold py-2 rounded-md flex items-center gap-2"
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", envColor(env.name).bg)} />
                    <span>{env.name}</span>
                    <span className="ml-auto text-2xs text-muted-foreground font-normal">的 spec</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="relative min-h-[500px]">
        {children}
      </div>
    </div>
  )
}
