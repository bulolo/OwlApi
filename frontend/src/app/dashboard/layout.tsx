"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Database,
  Settings,
  LogOut,
  Hexagon,
  ChevronRight,
  Bell,
  Search,
  Plus,
  Server,
  Users,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex text-zinc-900">
      {/* Sidebar - Compact & Light */}
      <aside className="w-60 bg-white border-r fixed h-full z-40 hidden lg:flex flex-col shadow-sm">
        <div className="h-14 flex items-center px-5 border-b border-zinc-100">
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center shadow-sm">
              <Hexagon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-zinc-800 uppercase">Owlapi</span>
          </Link>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-5 mb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">核心导航</p>
          <NavItem href="/dashboard" icon={LayoutDashboard}>项目列表</NavItem>
          <NavItem href="/dashboard/data-sources" icon={Database}>数据源</NavItem>
          <NavItem href="/dashboard/gateways" icon={Server}>网关节点</NavItem>
          <NavItem href="/dashboard/users" icon={Users}>用户中心</NavItem>

          <div className="mt-6">
            <p className="px-5 mb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">系统监控</p>
            <NavItem href="/dashboard/metrics" icon={Activity}>调用分析</NavItem>
            <NavItem href="/dashboard/settings" icon={Settings}>系统设置</NavItem>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-50 space-y-2">
          <div className="flex items-center space-x-3 px-1 mb-2">
            <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] font-bold">JY</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-800 truncate">管理员</p>
              <p className="text-[10px] text-zinc-400 truncate tracking-tight">Standard Plan</p>
            </div>
          </div>
          <Link href="/login">
            <Button variant="ghost" className="w-full justify-start h-9 text-xs text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-md">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              退出登录
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="h-14 bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 flex items-center justify-between px-6 shadow-sm">
          <div className="max-w-xs w-full">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="搜索资源..."
                className="w-full pl-9 h-8 bg-zinc-50 border-zinc-200 rounded-md text-xs transition-all focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-zinc-600">
              <Bell className="w-4 h-4" />
            </Button>
            <div className="w-[1px] h-4 bg-zinc-200 mx-1" />
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-8 px-3 text-xs font-bold shadow-sm flex items-center">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              新建
            </Button>
          </div>
        </header>

        <div className="p-6 max-w-[1280px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center h-9 px-5 transition-all duration-200 group cursor-pointer border-r-2",
        isActive
          ? "bg-blue-50 text-blue-600 border-blue-600 font-semibold"
          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 border-transparent"
      )}>
        <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600")} />
        <span className="text-xs">{children}</span>
      </div>
    </Link>
  )
}
