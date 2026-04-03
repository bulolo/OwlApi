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
import { useUIStore } from "@/store/useUIStore"

export function Header({ slug }: { slug?: string }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const { user, logout } = useUIStore()

  useEffect(() => { setMounted(true) }, [])

  const name = user?.name || "User"
  const email = user?.email || ""
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <header className="glass-header h-20 flex items-center justify-between px-8 border-b border-zinc-100">
      <div className="flex items-center gap-4">
        <TenantSwitcher slug={slug} />
      </div>

      <div className="flex items-center gap-3">
        {mounted ? (
          <>
            {/* 1. Platform Settings (SuperAdmin only) */}
            {user?.is_superadmin && (
              <Button
                variant="ghost"
                className="h-9 px-3 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-all text-xs font-bold gap-1.5"
                onClick={() => setOpenSettings(true)}
              >
                <Settings className="w-4 h-4" />
                平台设置
              </Button>
            )}

            <div className="w-px h-4 bg-zinc-100 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 p-1 pr-2 rounded-lg hover:bg-zinc-50 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white group-hover:bg-blue-600 transition-colors shadow-sm">
                    {initials}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-[11px] font-bold text-zinc-900 leading-none group-hover:text-blue-600 transition-colors">{name}</span>
                    {user?.is_superadmin && <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">超级管理员</span>}
                    {!user?.is_superadmin && <span className="text-[10px] text-zinc-400 font-bold tracking-widest mt-1">租户用户</span>}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-lg shadow-sm border-zinc-100/80 backdrop-blur-xl bg-white/90">
                <div className="px-3 py-3 border-b border-zinc-50 mb-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 opacity-60">Account</p>
                  <p className="text-xs font-bold text-zinc-900 truncate">{email}</p>
                </div>
                <DropdownMenuItem 
                  className="rounded-lg py-2 px-3 focus:bg-red-50 cursor-pointer text-sm font-bold text-red-500 flex items-center gap-3"
                  onClick={() => { logout(); router.push('/login') }}
                >
                  <LogOut className="h-4 w-4" />
                  安全退出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="w-32 h-9 bg-zinc-50 animate-pulse rounded-lg" />
        )}
      </div>

      <PlatformSettingsModal open={openSettings} onOpenChange={setOpenSettings} />
    </header>
  )
}
