import { useState } from "react"
import { useRouter } from "next/navigation"
import { useIsClient } from "@/hooks/useIsClient"
import { LogOut, Settings, ShieldCheck, ChevronDown, KeyRound } from "lucide-react"
import PlatformSettingsModal from "./PlatformSettingsModal"
import TenantSettingsModal from "./TenantSettingsModal"
import { ChangePasswordModal } from "./ChangePasswordModal"
import { LanguageSwitcher } from "./LanguageSwitcher"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TenantSwitcher } from "./TenantSwitcher"
import { useAuthStore } from "@/store/useAuthStore"

export function Header({ slug }: { slug?: string }) {
  const router = useRouter()
  const mounted = useIsClient()
  const [openSettings, setOpenSettings] = useState(false)
  const [openTenantSettings, setOpenTenantSettings] = useState(false)
  const [openChangePassword, setOpenChangePassword] = useState(false)
  const { user, logout } = useAuthStore()

  const name = user?.name || "User"
  const email = user?.email || ""
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <header className="glass-header h-20 flex items-center justify-between px-8 border-b border-border-subtle">
      <div className="flex items-center gap-4">
        <TenantSwitcher slug={slug} />
      </div>

      <div className="flex items-center gap-3">
        {mounted ? (
          <>
            {/* 1. Platform Settings (SuperAdmin only) */}
            {user?.is_superadmin && (
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                onClick={() => setOpenSettings(true)}
                title="平台设置"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                平台设置
              </button>
            )}

            {/* 2. Tenant Settings (all users) */}
            <button
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-zinc-50 rounded-xl transition-colors"
              onClick={() => setOpenTenantSettings(true)}
              title="系统设置"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-zinc-100 mx-1" />

            {/* 3. Language Switcher */}
            <LanguageSwitcher />

            <div className="w-px h-4 bg-zinc-100 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors group outline-none">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-2xs font-black text-white shadow-sm shrink-0">
                    {initials}
                  </div>
                  <div className="hidden sm:flex flex-col items-start min-w-0">
                    <span className="text-xs font-bold text-foreground leading-none truncate max-w-[96px]">{name}</span>
                    {user?.is_superadmin
                      ? <span className="text-2xs text-amber-500 font-bold uppercase tracking-wider mt-0.5">超级管理员</span>
                      : <span className="text-2xs text-muted-foreground mt-0.5 truncate max-w-[96px]">{email.split("@")[0]}</span>
                    }
                  </div>
                  <ChevronDown className="w-3 h-3 text-zinc-300 hidden sm:block shrink-0 group-hover:text-muted-foreground transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-xl shadow-modal border-border-subtle">
                <div className="flex items-center gap-3 px-2.5 py-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-black text-white shadow-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{name}</p>
                    <p className="text-2xs text-muted-foreground truncate mt-0.5">{email}</p>
                  </div>
                </div>
                <div className="h-px bg-border-subtle mx-1 my-1" />
                <DropdownMenuItem
                  className="rounded-lg py-2 px-2.5 focus:bg-zinc-50 cursor-pointer text-xs font-medium text-foreground flex items-center gap-2.5"
                  onClick={() => setOpenChangePassword(true)}
                >
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  修改密码
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg py-2 px-2.5 focus:bg-red-50 cursor-pointer text-xs font-bold text-red-500 flex items-center gap-2.5"
                  onClick={() => { logout(); router.push('/login') }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  安全退出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="w-32 h-9 bg-zinc-50 animate-pulse rounded-lg" />
        )}
      </div>

      <TenantSettingsModal open={openTenantSettings} onOpenChange={setOpenTenantSettings} />
      <PlatformSettingsModal open={openSettings} onOpenChange={setOpenSettings} />
      <ChangePasswordModal open={openChangePassword} onOpenChange={setOpenChangePassword} />
    </header>
  )
}
