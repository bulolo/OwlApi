"use client"

import { useState } from "react"
import { useTenant } from "@/providers/TenantProvider"
import { Box, ArrowLeft, Download, Code2, ChevronRight, ChevronDown, Layers, Settings2, ShieldCheck, BookOpen } from "lucide-react"
import { useProject, useEnvironments } from "@/hooks"
import { apiExportOpenAPI } from "@/lib/query"
import { useEndpointsQuery } from "./apis/_hooks/useEndpointsQuery"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { envColor } from "./_utils/envColor"
import Environments from "./environments/Environments"
import { ProjectAuthPanel } from "./_components/ProjectAuthPanel"
import { SdkModal } from "./_components/SdkModal"
import { SwaggerUIModal } from "./_components/SwaggerUIModal"
import { useEdition } from "@/hooks/useEdition"

export default function ProjectLayout({
  children,
  projectId,
}: {
  children: React.ReactNode
  projectId: string
}) {
  const activeTenant = useTenant()
  const { canUseEeFeatures } = useEdition()
  const { data: project } = useProject(activeTenant, Number(projectId))
  const { data: epData } = useEndpointsQuery(activeTenant, projectId)
  const { data: envs = [] } = useEnvironments(activeTenant, Number(projectId))
  const endpointCount = epData?.list?.length ?? 0
  const [exporting, setExporting] = useState(false)
  const [envSheetOpen, setEnvSheetOpen] = useState(false)
  const [authSheetOpen, setAuthSheetOpen] = useState(false)
  const [sdkModalOpen, setSdkModalOpen] = useState(false)
  const [swaggerOpen, setSwaggerOpen] = useState(false)

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

            {/* 访问控制 */}
            <Sheet open={authSheetOpen} onOpenChange={setAuthSheetOpen}>
              <SheetTrigger asChild>
                <button
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-zinc-50 rounded-lg border border-border-subtle hover:bg-zinc-100 transition-colors"
                  title="访问控制"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-2xs text-muted-foreground font-medium">鉴权</span>
                </button>
              </SheetTrigger>
              <SheetContent className="w-[460px] sm:max-w-[460px]">
                <SheetHeader>
                  <SheetTitle>访问控制</SheetTitle>
                </SheetHeader>
                <ProjectAuthPanel projectId={Number(projectId)} />
              </SheetContent>
            </Sheet>

            {/* 环境管理入口——Sheet 侧滑，保持项目上下文可见 */}
            <Sheet open={envSheetOpen} onOpenChange={setEnvSheetOpen}>
              <SheetTrigger asChild>
                <button
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-zinc-50 rounded-lg border border-border-subtle hover:bg-zinc-100 transition-colors"
                  title="管理环境"
                >
                  <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-2xs text-muted-foreground font-medium">环境</span>
                </button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>环境管理</SheetTitle>
                </SheetHeader>
                <Environments
                  projectId={Number(projectId)}
                  onClose={() => setEnvSheetOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/* 在线文档（主操作）+ 导出 OpenAPI（下拉）合并为分裂按钮 */}
            <div className={cn(
              "inline-flex rounded-lg border border-border shadow-sm overflow-hidden",
              (!canUseEeFeatures || envs.length === 0) && "opacity-50 pointer-events-none"
            )}>
              <button
                suppressHydrationWarning
                onClick={() => setSwaggerOpen(true)}
                title={!canUseEeFeatures ? "需要企业版" : undefined}
                className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold bg-white hover:bg-zinc-50 transition-colors border-r border-border"
              >
                <BookOpen className="w-3.5 h-3.5" /> 在线文档
                {!canUseEeFeatures && <EeBadge />}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    suppressHydrationWarning
                    disabled={exporting}
                    className="flex items-center h-9 px-2 bg-white hover:bg-zinc-50 transition-colors text-muted-foreground"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-lg shadow-modal border-border p-1">
                  {envs.map(env => (
                    <DropdownMenuItem
                      key={env.id}
                      onClick={() => handleExport(env.name)}
                      className="text-xs font-bold py-2 rounded-md flex items-center gap-2"
                    >
                      <Download className="w-3 h-3 text-muted-foreground" />
                      <span className={cn("w-1.5 h-1.5 rounded-full", envColor(env.name).bg)} />
                      <span>{env.name}</span>
                      <span className="ml-auto text-2xs text-muted-foreground font-normal">导出</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              suppressHydrationWarning
              variant="outline"
              disabled={!canUseEeFeatures || envs.length === 0}
              title={!canUseEeFeatures ? "需要企业版" : undefined}
              onClick={() => setSdkModalOpen(true)}
              className="h-9 px-4 rounded-lg border-border text-xs font-bold shadow-sm hover:bg-zinc-50 hover:border-border transition-all"
            >
              <Code2 className="w-3.5 h-3.5 mr-2" /> 客户端 SDK
              {!canUseEeFeatures && <EeBadge />}
            </Button>

            {canUseEeFeatures && (
              <SdkModal
                open={sdkModalOpen}
                onOpenChange={setSdkModalOpen}
                slug={activeTenant}
                projectId={Number(projectId)}
                envs={envs}
              />
            )}

            {canUseEeFeatures && (
              <SwaggerUIModal
                open={swaggerOpen}
                onOpenChange={setSwaggerOpen}
                slug={activeTenant}
                projectId={Number(projectId)}
                envs={envs}
              />
            )}
          </div>
        </div>
      </div>

      <div className="relative min-h-[500px]">
        {children}
      </div>
    </div>
  )
}

function EeBadge() {
  return (
    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-amber-100 text-amber-700 border border-amber-200">
      EE
    </span>
  )
}
