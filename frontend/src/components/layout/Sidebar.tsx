"use client"

import { useState } from "react"
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
  Activity,
  ChevronsUpDown,
  Building2,
  PlusCircle,
  Briefcase,
  ShieldCheck,
  ArrowLeftRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/useUIStore"
import { useTenantStore } from "@/store/useTenantStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function Sidebar() {
  const pathname = usePathname()
  const { viewContext, setViewContext, activeTenant, setActiveTenant } = useUIStore()
  const { tenants, recentTenants, markTenantAsRecent } = useTenantStore()
  
  const recentList = tenants.filter(t => recentTenants.includes(t.id))
  
  const currentTenantObj = tenants.find(t => t.domain === activeTenant) || tenants[0]

  const ADMIN_MENUS = [
    {
      label: "平台管理 (Admin)",
      items: [
        { href: "/dashboard/overview", label: "平台看板", icon: LayoutDashboard },
        { href: "/dashboard/tenants", label: "租户管理", icon: Building2 },
        { href: "/dashboard/settings", label: "全局配置", icon: Settings },
      ]
    },
    {
      label: "监控统计 (Analytics)",
      items: [
        { href: "/dashboard/metrics", label: "调用分析", icon: Activity },
      ]
    }
  ]

  const TENANT_MENUS = [
    {
      label: "工作台 (Dashboard)",
      items: [
        { href: "/dashboard/overview", label: "项目概览", icon: LayoutDashboard },
      ]
    },
    {
      label: "基础资源 (Resources)",
      items: [
        { href: "/dashboard/gateways", label: "执行节点", icon: Server },
        { href: "/dashboard/data-sources", label: "数据源", icon: Database },
      ]
    },
    {
      label: "核心服务 (Build)",
      items: [
        { href: "/dashboard/projects", label: "数据接口 (API)", icon: Box },
        { href: "/dashboard/models", label: "智能中心 (AI)", icon: BrainCircuit },
      ]
    },
    {
      label: "监控统计 (Analytics)",
      items: [
        { href: "/dashboard/metrics", label: "调用分析", icon: Activity },
      ]
    },
    {
      label: "组织管理 (Settings)",
      items: [
        { href: "/dashboard/users", label: "成员管理", icon: Users },
        { href: "/dashboard/settings", label: "系统设置", icon: Settings },
      ]
    }
  ]

  return (
    <aside className="w-68 bg-white border-r border-zinc-200/80 fixed h-full z-40 hidden lg:flex flex-col shadow-[1px_0_3px_0_rgba(0,0,0,0.02)]">
      {/* Brand & Context Switcher */}
      <div className="p-4 border-b border-zinc-100 space-y-4">
        <Link href="/dashboard" className="flex items-center gap-3 group px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Hexagon className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col justify-center h-full">
            <span className="font-bold text-base text-zinc-900 tracking-tight leading-none">OwlAPI</span>
            <span className="text-[9px] text-zinc-400 font-black tracking-widest mt-0.5 uppercase">B2B SaaS</span>
          </div>
        </Link>
        
        {/* View Mode Switcher */}
        <div className="px-1">
          <Select 
            value={viewContext === 'SYSTEM' ? 'SYSTEM' : `TENANT:${activeTenant}`} 
            onValueChange={(val: string) => {
              if (val === 'SYSTEM') {
                setViewContext('SYSTEM')
              } else if (val.startsWith('TENANT:')) {
                const domain = val.split(':')[1]
                const tenant = tenants.find(t => t.domain === domain)
                if (tenant) {
                  setViewContext('TENANT')
                  setActiveTenant(domain)
                  markTenantAsRecent(tenant.id)
                }
              }
            }}
          >
            <SelectTrigger className="w-full h-11 bg-zinc-50 border-zinc-200/60 hover:bg-zinc-100 transition-all shadow-none">
               <div className="flex items-center gap-2 text-zinc-600 w-full overflow-hidden">
                 <div className={cn(
                   "w-6 h-6 rounded flex items-center justify-center shrink-0",
                   viewContext === 'SYSTEM' ? "bg-zinc-900 text-white" : "bg-blue-100 text-blue-600"
                 )}>
                    {viewContext === 'SYSTEM' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                 </div>
                 <div className="flex-1 text-left truncate">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-0.5">Current View</p>
                    <p className="font-bold text-[11px] tracking-tight text-zinc-900">
                      {viewContext === 'SYSTEM' ? "平台管理员视角" : `${currentTenantObj?.name} (租户)`}
                    </p>
                 </div>
                 <ChevronsUpDown className="w-3 h-3 text-zinc-400" />
               </div>
            </SelectTrigger>
            <SelectContent className="w-64 p-0 overflow-hidden border-zinc-200 shadow-xl">
              <div className="max-h-[400px] overflow-y-auto p-1">
                <SelectItem value="SYSTEM" className="text-xs font-bold py-2 rounded-md">
                   <div className="flex items-center gap-2">
                     <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                     平台管理视图 (Admin)
                   </div>
                </SelectItem>
                
                <div className="h-px bg-zinc-100 my-1" />
                
                {recentList.length > 0 ? (
                  <>
                    <div className="px-2 py-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">最近管理的租户</div>
                    {recentList.map(t => (
                      <SelectItem key={t.id} value={`TENANT:${t.domain}`} className="text-xs font-medium py-2 rounded-md">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          <span className="truncate">{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-[10px] text-zinc-400 font-medium">暂无最近访问的租户</p>
                  </div>
                )}
              </div>

              <div className="p-1 border-t border-zinc-100 bg-zinc-50/30">
                <Link href="/dashboard/tenants">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors">
                     <ArrowLeftRight className="w-3.5 h-3.5" />
                     进入租户管理列表...
                  </div>
                </Link>
                <Link href="/dashboard/users/tenants/register">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100 p-2 rounded-md transition-colors">
                     <PlusCircle className="w-3.5 h-3.5" />
                     开通新租户
                  </div>
                </Link>
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation - Filtered by Context */}
      <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200">
        {(viewContext === 'SYSTEM' ? ADMIN_MENUS : TENANT_MENUS).map((group, idx) => (
          <div key={idx} className="space-y-1">
             <div className="px-3 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em] opacity-80">{group.label}</div>
             <div className="space-y-0.5">
               {group.items.map((item) => (
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
            <p className="text-xs font-bold text-zinc-900 truncate">
               {viewContext === 'SYSTEM' ? "平台管理员" : "租户管理员"}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">jy@owlapi.pro</p>
          </div>
        </div>
        <Link href="/login" className="block">
          <Button variant="ghost" className="w-full justify-start h-9 text-xs font-bold text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all">
            <LogOut className="w-3.5 h-3.5 mr-2" />
            注销
          </Button>
        </Link>
      </div>
    </aside>
  )
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || (pathname.startsWith(`${href}/`))

  return (
    <Link href={href} className="block group">
      <div className={cn(
        "flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all duration-200 border border-transparent",
        isActive 
          ? "bg-blue-600/5 text-blue-600 border-blue-600/10 shadow-[0_1px_2px_rgba(37,99,235,0.05)]" 
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60"
      )}>
        <Icon className={cn(
          "w-4 h-4 transition-colors", 
          isActive ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600"
        )} />
        <span className="tracking-tight">{label}</span>
        {isActive && (
          <div className="ml-auto w-1 h-1 rounded-full bg-blue-600" />
        )}
      </div>
    </Link>
  )
}
