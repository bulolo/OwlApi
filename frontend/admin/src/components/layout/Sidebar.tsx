"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Box,
  Server,
  Database,
  Users,
  Hexagon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/useUIStore"

export function Sidebar({ slug }: { slug?: string }) {
  const { activeTenant: storeTenant, sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  const collapsed = sidebarCollapsed

  const activeTenant = slug !== 'system' ? (slug || storeTenant) : storeTenant

  const MENUS = [
    {
      group: "工作空间",
      items: [
        { href: `/${activeTenant}/overview`, label: "概览", icon: LayoutDashboard },
      ]
    },
    {
      group: "核心资源",
      items: [
        { href: `/${activeTenant}/gateways`, label: "网关", icon: Server },
        { href: `/${activeTenant}/data-sources`, label: "数据源", icon: Database },
      ]
    },
    {
      group: "服务中心",
      items: [
        { href: `/${activeTenant}/projects`, label: "项目", icon: Box },
      ]
    },
    {
      group: "组织管理",
      items: [
        { href: `/${activeTenant}/users`, label: "成员管理", icon: Users },
      ]
    }
  ]

  return (
    <aside className={cn(
      "bg-white border-r border-zinc-100 fixed h-full z-40 hidden lg:flex flex-col shadow-[1px_0_0_0_rgba(0,0,0,0.02)] transition-all duration-300",
      collapsed ? "w-[60px]" : "w-56"
    )}>
      {/* Brand */}
      <div className={cn("h-16 flex items-center mb-1", collapsed ? "px-3 justify-center" : "px-5")}>
        <Link href={`/${activeTenant}/overview`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 transition-all duration-500 group-hover:bg-blue-600 group-hover:rotate-6 shadow-sm">
            <Hexagon className="w-4.5 h-4.5 text-white stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-zinc-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">OwlAPI</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">API网关平台</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-1 pb-12 custom-scrollbar", collapsed ? "px-2" : "px-4")}>
        {MENUS.map((group, idx) => (
          <div key={idx} className="space-y-1.5">
            {!collapsed && (
              <h3 className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
                {group.group}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.href} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer with collapse toggle */}
      <div className={cn("py-3 border-t border-zinc-100 flex items-center", collapsed ? "px-3 justify-center" : "px-5 justify-between")}>
        {!collapsed && <span className="text-[10px] font-bold text-zinc-300 tracking-widest">v0.1.0</span>}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}

function NavItem({ href, icon: Icon, label, collapsed }: { href: string; icon: any; label: string; collapsed: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  return (
    <Link href={href} className="block relative group" title={collapsed ? label : undefined}>
      <div className={cn(
        "flex items-center gap-3 rounded-lg transition-all duration-300 relative",
        collapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
        isActive
          ? "bg-blue-50/50 text-blue-600 shadow-sm"
          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
      )}>
        <div className={cn(
          "flex items-center justify-center w-6 h-6 shrink-0 rounded-lg transition-all duration-300",
          isActive ? "bg-white shadow-sm" : "bg-transparent"
        )}>
          <Icon className={cn(
            "w-[18px] h-[18px] transition-all",
            isActive ? "text-blue-600 scale-110" : "text-zinc-400 group-hover:text-zinc-900 group-hover:scale-105"
          )} />
        </div>
        {!collapsed && (
          <span className={cn(
            "text-xs font-medium tracking-tight transition-all duration-200",
            isActive ? "text-blue-600 font-bold translate-x-0.5" : "text-zinc-600 group-hover:translate-x-0.5"
          )}>
            {label}
          </span>
        )}
        {isActive && !collapsed && (
          <div className="absolute -left-2 w-1.5 h-6 bg-blue-600 rounded-full shadow-[2px_0_12px_rgba(37,99,235,0.4)]" />
        )}
      </div>
    </Link>
  )
}
