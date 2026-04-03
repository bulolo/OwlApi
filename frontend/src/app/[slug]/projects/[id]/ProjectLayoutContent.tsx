"use client"

import { useProjectStore } from "@/store/useProjectStore"
import { useUIStore } from "@/store/useUIStore"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LayoutGrid, Layers, Settings, FileCode, Activity, Terminal } from "lucide-react"

export default function ProjectLayoutContent({
  children,
  projectId,
}: {
  children: React.ReactNode
  projectId: string
}) {
  const { activeTenant } = useUIStore()
  const { projects } = useProjectStore()
  const project = projects.find(p => p.id === projectId)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Small Project Header */}
      <div className="flex flex-col space-y-2 px-1 mb-2">
        <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>Active Workshop</span>
        </div>
        <div className="flex items-baseline space-x-4">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {project?.name || 'Loading...'}
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-400 border-l pl-4 border-zinc-200">
             <span className="bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100 font-mono">ID: {projectId.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Dense Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-100">
        <CompactTab
          href={`/${activeTenant}/projects/${projectId}/apis`}
          label="接口管理"
          icon={FileCode}
        />
        <CompactTab
          href={`/${activeTenant}/projects/${projectId}/logs`}
          label="日志中心"
          icon={Terminal}
        />
        <CompactTab
          href={`/${activeTenant}/projects/${projectId}/database`}
          label="数据中心"
          icon={Layers}
        />
        <CompactTab
          href={`/${activeTenant}/projects/${projectId}/settings`}
          label="数据源配置"
          icon={Settings}
        />
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
        "relative px-6 py-3.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-300 flex items-center space-x-2.5 border-b-2",
        isActive
          ? "text-blue-600 border-blue-600 bg-blue-50/30"
          : "text-zinc-400 border-transparent hover:text-zinc-700 hover:border-zinc-200"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", isActive ? "text-blue-600" : "text-zinc-300 transition-colors group-hover:text-zinc-500")} />
      <span>{label}</span>
    </Link>
  )
}
