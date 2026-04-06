"use client"

import { useUIStore } from "@/store/useUIStore"
import { Box, ArrowLeft, Settings, Download, ChevronRight, Layers } from "lucide-react"
import { useProject } from "@/hooks"
import { apiExportOpenAPI } from "@/lib/api-client"
import { listEndpoints } from "@/lib/sdk"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { toast } from "sonner"

export default function ProjectLayoutContent({
  children,
  projectId,
}: {
  children: React.ReactNode
  projectId: string
}) {
  const { activeTenant } = useUIStore()
  const { data: project } = useProject(activeTenant, Number(projectId))
  const { data: epData } = useQuery({
    queryKey: ["endpoints", activeTenant, projectId],
    queryFn: async () => {
      const res = await listEndpoints({ path: { slug: activeTenant, projectId: Number(projectId) } })
      return res as unknown as { list?: unknown[] } | undefined
    },
    enabled: !!activeTenant && !!projectId,
  })
  const endpointCount = epData?.list?.length ?? 0

  const handleExport = async () => {
    try {
      await apiExportOpenAPI(activeTenant, Number(projectId))
    } catch (err: unknown) {
      toast.error("导出失败: " + (err instanceof Error ? err.message : "未知错误"))
    }
  }

  return (
    <div className="space-y-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-5">
        <Link href={`/${activeTenant}/projects`} className="hover:text-blue-600 transition-colors">
          项目列表
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-600 font-semibold">{project?.name || "加载中..."}</span>
      </div>

      {/* Project Header */}
      <div className="bg-white border border-zinc-100 rounded-lg shadow-sm mb-6">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${activeTenant}/projects`}>
              <Button variant="ghost" size="icon" className="rounded-lg hover:bg-zinc-100 w-9 h-9">
                <ArrowLeft className="w-4 h-4 text-zinc-500" />
              </Button>
            </Link>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center border shadow-sm text-blue-600 border-blue-100 bg-blue-50/30">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                    {project?.name || "加载中..."}
                  </h1>
                  <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    ID:{projectId}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500 mt-1 font-medium">
                  {project?.description || "SQL to API 接口编排"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-2 mr-4 px-4 py-2 bg-zinc-50 rounded-lg border border-zinc-100">
              <Layers className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-zinc-600">{endpointCount}</span>
              <span className="text-xs text-zinc-400">个接口</span>
            </div>

            <Button
              variant="outline"
              onClick={handleExport}
              className="h-9 px-4 rounded-lg border-zinc-200 text-xs font-bold shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all"
            >
              <Download className="w-3.5 h-3.5 mr-2" /> 导出 OpenAPI
            </Button>
            <Link href={`/${activeTenant}/projects/edit/${projectId}`}>
              <Button variant="outline" className="h-9 px-4 rounded-lg border-zinc-200 text-xs font-bold shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all">
                <Settings className="w-3.5 h-3.5 mr-2" /> 项目设置
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="relative min-h-[500px]">
        {children}
      </div>
    </div>
  )
}
