"use client"

import { useProjectStore } from "@/store/useProjectStore"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { LayoutGrid, Layers, Settings, FileCode } from "lucide-react"

export default function ProjectLayoutContent({
  children,
  projectId,
}: {
  children: React.ReactNode
  projectId: string
}) {
  const { projects } = useProjectStore()
  const project = projects.find(p => p.id === projectId)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Small Project Header */}
      <div className="flex flex-col space-y-1 px-1">
        <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">
          <LayoutGrid className="w-3 h-3" />
          <span>Active Workshop</span>
        </div>
        <div className="flex items-baseline space-x-3">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            {project?.name || 'Loading...'}
          </h2>
          <span className="text-xs text-zinc-400 font-medium border-l pl-3 border-zinc-200">
            ID: {projectId.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Dense Tabs */}
      <div className="flex items-center border-b border-zinc-200">
        <CompactTab
          href={`/dashboard/projects/${projectId}/apis`}
          label="API 管理"
          icon={FileCode}
        />
        <CompactTab
          href={`/dashboard/projects/${projectId}/database`}
          label="数据浏览器"
          icon={Layers}
        />
        <CompactTab
          href={`/dashboard/projects/${projectId}/settings`}
          label="网络配置"
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
        "relative px-5 py-2.5 text-xs font-bold transition-all duration-300 flex items-center space-x-2 border-b-2",
        isActive
          ? "text-blue-600 border-blue-600"
          : "text-zinc-400 border-transparent hover:text-zinc-700 hover:border-zinc-200"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", isActive ? "text-blue-600" : "text-zinc-300")} />
      <span>{label}</span>
    </Link>
  )
}
