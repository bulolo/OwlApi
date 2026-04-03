import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import PlatformSettingsModal from "./PlatformSettingsModal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { TenantSwitcher } from "./TenantSwitcher"

export function Header({ slug }: { slug?: string }) {
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
        <TenantSwitcher slug={slug} />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {mounted ? (
          <>
            {/* 1. Platform Settings */}
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-all"
              onClick={() => setOpenSettings(true)}
              title="平台设置"
            >
              <Settings className="w-4 h-4" />
            </Button>

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
