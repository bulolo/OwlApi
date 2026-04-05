"use client"

import { useEffect, useState } from "react"
import { useUIStore } from "@/store/useUIStore"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { FileCode, Terminal } from "lucide-react"
import { apiGetProject, type Project } from "@/lib/api-client"

export default function ProjectLayoutContent({
  children,
  projectId,
}: {
  children: React.ReactNode
  projectId: string
}) {
  const { activeTenant } = useUIStore()
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    if (activeTenant && projectId) {
      apiGetProject(activeTenant, Number(projectId)).then(setProject).catch(() => {})
    }
  }, [activeTenant, projectId])

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2 px-1 mb-2">
        <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>项目</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          {project?.name || "加载中..."}
        </h1>
      </div>

      <div className="flex items-center gap-1 border-b border-zinc-100">
        <CompactTab href={`/${activeTenant}/projects/${projectId}/apis`} label="接口管理" icon={FileCode} />
        <CompactTab href={`/${activeTenant}/projects/${projectId}/logs`} label="日志" icon={Terminal} />
      </div>

      <div className="relative pt-1 min-h-[500px]">
        {children}
      </div>
    </div>
  )
}

function CompactTab({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        "relative px-6 py-3.5 text-[11px] font-bold uppercase tracking-wide transition-all flex items-center space-x-2.5 border-b-2",
        isActive
          ? "text-blue-600 border-blue-600 bg-blue-50/30"
          : "text-zinc-400 border-transparent hover:text-zinc-700 hover:border-zinc-200"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", isActive ? "text-blue-600" : "text-zinc-300")} />
      <span>{label}</span>
    </Link>
  )
}
