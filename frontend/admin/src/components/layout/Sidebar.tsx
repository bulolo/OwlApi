"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Box,
  Server,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  FileCode2,
  Github,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/useUIStore"
import pkg from "../../../package.json"

export function Sidebar({ slug }: { slug?: string }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  const collapsed = sidebarCollapsed

  const activeTenant = slug ?? ""

  const MENUS = [
    {
      group: "控制台",
      items: [
        { href: `/${activeTenant}/overview`, label: "概览", icon: LayoutDashboard },
      ]
    },
    {
      group: "核心资源",
      items: [
        { href: `/${activeTenant}/gateways`, label: "网关", icon: Server },
        { href: `/${activeTenant}/data-sources`, label: "数据源", icon: Database },
        { href: `/${activeTenant}/scripts`, label: "脚本库", icon: FileCode2 },
      ]
    },
    {
      group: "工作空间",
      items: [
        { href: `/${activeTenant}/projects`, label: "项目", icon: Box },
      ]
    },
  ]

  return (
    <aside className={cn(
      "bg-white border-r border-border-subtle fixed h-full z-40 hidden lg:flex flex-col transition-all duration-300",
      collapsed ? "w-[60px]" : "w-56"
    )}>
      {/* Brand */}
      <div className={cn("h-16 flex items-center mb-1", collapsed ? "px-3 justify-center" : "px-5")}>
        <Link href={`/${activeTenant}/overview`} className="flex items-center gap-3 group">
          <Image src="/logo.svg" alt="OwlApi" width={36} height={36} className="shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">OwlAPI</span>
              <span className="text-2xs font-bold text-muted-foreground uppercase tracking-widest mt-1.5">API网关平台</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-1 pb-4 custom-scrollbar", collapsed ? "px-2" : "px-4")}>
        {MENUS.map((group, idx) => (
          <div key={idx} className="space-y-1.5">
            {!collapsed && (
              <h3 className="px-3 text-2xs font-bold text-muted-foreground uppercase tracking-[0.15em]">
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

      {/* Footer */}
      {collapsed ? (
        <div className="mt-auto px-2 py-4 flex flex-col items-center gap-3">
          <Link
            href="https://github.com/bulolo/owlapi"
            target="_blank"
            title="GitHub"
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Github className="w-4 h-4" />
          </Link>
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary/80 rounded-full text-2xs font-bold border border-primary/20">
            v{pkg.version}
          </span>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mt-auto px-4 py-5 space-y-5">
          <div className="space-y-1">
            <Link
              href="https://github.com/bulolo/owlapi"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-zinc-700 hover:bg-zinc-50 transition-all group"
            >
              <Github className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              <span className="font-medium">GitHub</span>
            </Link>
            <Link
              href="https://github.com/bulolo/owlapi/wiki"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-zinc-700 hover:bg-zinc-50 transition-all group"
            >
              <BookOpen className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              <span className="font-medium">文档</span>
            </Link>
          </div>

          <div className="space-y-3 pt-2 border-t border-border-subtle/80">
            <div className="flex items-center justify-between px-1">
              <span className="text-2xs font-bold tracking-wider text-zinc-300 uppercase">OwlAPI</span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold tracking-wide border shadow-sm bg-zinc-50 text-muted-foreground border-border-subtle">
                  CE
                </span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary/80 rounded-full text-2xs font-bold border border-primary/20 shadow-sm">
                  v{pkg.version}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex-1 text-center text-2xs text-zinc-300/70 font-medium">© 2026 OwlAPI</span>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function NavItem({ href, icon: Icon, label, collapsed }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; collapsed: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  return (
    <Link href={href} className="block relative group" title={collapsed ? label : undefined}>
      <div className={cn(
        "flex items-center gap-3 rounded-lg transition-all duration-300 relative",
        collapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
        isActive
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-zinc-50"
      )}>
        <div className={cn(
          "flex items-center justify-center w-6 h-6 shrink-0 rounded-lg transition-all duration-300",
          isActive ? "bg-white shadow-sm" : "bg-transparent"
        )}>
          <Icon className={cn(
            "w-[18px] h-[18px] transition-all",
            isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground group-hover:scale-105"
          )} />
        </div>
        {!collapsed && (
          <span className={cn(
            "text-xs font-medium tracking-tight transition-all duration-200",
            isActive ? "text-primary font-bold translate-x-0.5" : "text-zinc-600 group-hover:translate-x-0.5"
          )}>
            {label}
          </span>
        )}
        {isActive && !collapsed && (
          <div className="absolute -left-2 w-1.5 h-6 bg-primary rounded-full shadow-glow" />
        )}
      </div>
    </Link>
  )
}
