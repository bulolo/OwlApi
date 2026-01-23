"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Box,
  Server,
  Database,
  Users,
  Settings,
  BrainCircuit,
  LogOut,
  Hexagon,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MENU_ITEMS = [
  {
    category: "Infrastructure",
    items: [
      { href: "/dashboard/overview", label: "总览", icon: LayoutDashboard },
      { href: "/dashboard/gateways", label: "执行节点", icon: Server },
      { href: "/dashboard/data-sources", label: "数据源", icon: Database },
    ]
  },
  {
    category: "Engines",
    items: [
      { href: "/dashboard/projects", label: "API 引擎", icon: Box },
      { href: "/dashboard/models", label: "模型网关", icon: BrainCircuit },
    ]
  },
  {
    category: "System",
    items: [
      { href: "/dashboard/metrics", label: "调用分析", icon: Activity },
      { href: "/dashboard/users", label: "用户管理", icon: Users },
      { href: "/dashboard/settings", label: "系统设置", icon: Settings },
    ]
  }
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-zinc-200/80 fixed h-full z-40 hidden lg:flex flex-col shadow-[1px_0_3px_0_rgba(0,0,0,0.02)]">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Hexagon className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col justify-center h-full">
            <span className="font-bold text-base text-zinc-900 tracking-tight leading-none">OwlAPI</span>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wide mt-0.5">ENTERPRISE</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200">
        {MENU_ITEMS.map((section, idx) => (
          <div key={idx}>
            <p className="px-3 mb-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-none select-none">{section.category}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
        <div className="flex items-center gap-3 mb-4 px-2 p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-zinc-200/60 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center text-xs font-bold text-zinc-700 group-hover:border-blue-200 transition-colors">
            JY
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">Admin User</p>
            <p className="text-[10px] text-zinc-500 truncate">admin@owlapi.com</p>
          </div>
        </div>
        <Link href="/login" className="block">
          <Button variant="ghost" className="w-full justify-start h-9 text-xs font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all">
            <LogOut className="w-3.5 h-3.5 mr-2" />
            退出登录
          </Button>
        </Link>
      </div>
    </aside>
  )
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const pathname = usePathname()
  // More precise active check: 
  // 1. Exact match
  // 2. Starts with href AND followed by / (to avoid matching /dashboard-extra when href is /dashboard)
  const isActive = pathname === href || (pathname.startsWith(`${href}/`))

  return (
    <Link href={href} className="block group">
      <div className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
        isActive 
          ? "bg-blue-50 text-blue-700" 
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80"
      )}>
        <Icon className={cn(
          "w-4.5 h-4.5 transition-colors", 
          isActive ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600"
        )} />
        <span className="tracking-tight">{label}</span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
        )}
      </div>
    </Link>
  )
}
