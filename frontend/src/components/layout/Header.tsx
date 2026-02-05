import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Bell, HelpCircle, Settings2, LayoutDashboard, Activity, Settings, LogOut, User } from "lucide-react"
import { useUIStore } from "@/store/useUIStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PlatformSettingsModal from "./PlatformSettingsModal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { TenantSwitcher } from "./TenantSwitcher"

export function Header({ domain }: { domain?: string }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="glass-header h-20 flex items-center justify-between px-8 border-b border-zinc-200/50">
      {/* Brand & Tenant Switcher */}
      <div className="flex items-center gap-4">
        <TenantSwitcher domain={domain} />
      </div>

      {/* Right Actions */}
      {/* Right Actions - 3-Column Minimalist Refinement */}
      <div className="flex items-center gap-3">
        {mounted ? (
          <>
            {/* 1. Global System Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-all">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-zinc-100/80 backdrop-blur-xl bg-white/90">
                <DropdownMenuLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2">系统治理</DropdownMenuLabel>
                <div className="space-y-0.5">
                  <DropdownMenuItem onClick={() => router.push('/system/overview')} className="rounded-xl py-2 px-3 focus:bg-zinc-50 cursor-pointer flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-600">运行看板</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/system/metrics')} className="rounded-xl py-2 px-3 focus:bg-zinc-50 cursor-pointer flex items-center gap-3">
                    <Activity className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-600">度量分析</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1.5 bg-zinc-50" />
                  <DropdownMenuItem onClick={() => setOpenSettings(true)} className="rounded-xl py-2 px-3 focus:bg-zinc-50 cursor-pointer flex items-center gap-3 text-blue-600">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-bold">系统设置</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. Simple Spacer/Divider */}
            <div className="w-px h-4 bg-zinc-100 mx-1" />

            {/* 3. User Account Focus */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 p-1 pr-2 rounded-2xl hover:bg-zinc-50 transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white group-hover:bg-blue-600 transition-colors shadow-sm">
                    JY
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-[11px] font-bold text-zinc-900 leading-none group-hover:text-blue-600 transition-colors">Jeane Yao</span>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1 opacity-70">Admin</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-zinc-100/80 backdrop-blur-xl bg-white/90">
                <div className="px-3 py-3 border-b border-zinc-50 mb-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 opacity-60">Account</p>
                  <p className="text-xs font-bold text-zinc-900 truncate">jeane@owl.api</p>
                </div>
                <DropdownMenuItem 
                  className="rounded-xl py-2 px-3 focus:bg-red-50 cursor-pointer text-sm font-bold text-red-500 flex items-center gap-3"
                  onClick={() => router.push('/login')}
                >
                  <LogOut className="h-4 w-4" />
                  安全退出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="w-32 h-9 bg-zinc-50 animate-pulse rounded-2xl" />
        )}
      </div>

      <PlatformSettingsModal open={openSettings} onOpenChange={setOpenSettings} />
    </header>
  )
}
