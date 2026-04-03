"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Box,
  Server,
  Database,
  Users,
  Hexagon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/useUIStore"

export function Sidebar({ slug }: { slug?: string }) {
  const { activeTenant: storeTenant } = useUIStore()
  
  // Use slug from props as primary source for tenant, fallback to store
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
        { href: `/${activeTenant}/projects`, label: "接口中心", icon: Box },
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
    <aside className="w-72 bg-white border-r border-zinc-100 fixed h-full z-40 hidden lg:flex flex-col shadow-[1px_0_0_0_rgba(0,0,0,0.02)]">
      {/* Premium Brand Section */}
      <div className="h-20 flex items-center px-8 mb-2">
        <Link href={`/${activeTenant}/overview`} className="flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center transition-all duration-500 group-hover:bg-blue-600 group-hover:rotate-6 shadow-xl shadow-zinc-200 group-hover:shadow-blue-200">
            <Hexagon className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-zinc-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">OwlAPI</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">API网关平台</span>
          </div>
        </Link>
      </div>

      {/* Navigation with Grand Spacing */}
      <nav className="flex-1 px-6 space-y-8 overflow-y-auto overflow-x-hidden pt-2 pb-12 custom-scrollbar">
        {MENUS.map((group, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
              {group.group}
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-8 py-4 border-t border-zinc-100">
        <span className="text-[10px] font-bold text-zinc-300 tracking-widest">v0.1.0</span>
      </div>
    </aside>
  )
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  return (
    <Link href={href} className="block relative group">
      <div className={cn(
        "flex items-center gap-3.5 px-3 py-2 rounded-2xl transition-all duration-300 relative",
        isActive 
          ? "bg-blue-50/50 text-blue-600 shadow-sm shadow-blue-500/5" 
          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
      )}>
        <div className={cn(
          "flex items-center justify-center w-6 h-6 shrink-0 rounded-xl transition-all duration-300",
          isActive ? "bg-white shadow-sm" : "bg-transparent"
        )}>
          <Icon className={cn(
            "w-[18px] h-[18px] transition-all",
            isActive ? "text-blue-600 scale-110" : "text-zinc-400 group-hover:text-zinc-900 group-hover:scale-105"
          )} />
        </div>
        <span className={cn(
          "text-[13px] font-medium tracking-tight transition-all duration-200",
          isActive ? "text-blue-600 font-bold translate-x-0.5" : "text-zinc-600 group-hover:translate-x-0.5"
        )}>
          {label}
        </span>

        {isActive && (
          <motion.div 
            layoutId="sidebar-active-indicator"
            className="absolute -left-2 w-1.5 h-6 bg-blue-600 rounded-full shadow-[2px_0_12px_rgba(37,99,235,0.4)]"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </div>
    </Link>
  )
}
