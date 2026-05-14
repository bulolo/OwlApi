"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAdminMutation } from "@/hooks"
import { useTenant } from "@/providers/TenantProvider"
import { Globe, GitBranch, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { apiGetTenant, apiUpdateTenantSettings } from "@/lib/api-client"
import UsersComponent from "@/app/[slug]/users/Users"

const tabs = [
  { key: "general", icon: Globe,  label: "通用配置" },
  { key: "users",   icon: Users,  label: "成员管理" },
] as const

export default function Settings() {
  const activeTenant = useTenant()
  const pathname = usePathname()
  const isGeneral = !pathname.endsWith("/users")

  const { data: tenant } = useQuery({
    queryKey: ["tenant", activeTenant],
    queryFn: () => apiGetTenant(activeTenant),
    enabled: !!activeTenant,
  })

  const [localMaxVersions, setLocalMaxVersions] = useState<number | null>(null)
  const maxVersions = localMaxVersions ?? tenant?.max_release_versions ?? 5

  const saveSettings = useAdminMutation({
    mutationFn: () =>
      apiUpdateTenantSettings(activeTenant, localMaxVersions ?? tenant?.max_release_versions ?? 5),
    successMsg: "配置已保存",
    invalidateKeys: [["tenant", activeTenant]],
  })

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">系统设置</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">当前组织的配置与成员管理</p>
        </div>
        {isGeneral && (
          <Button
            className="h-9 px-5 text-xs font-bold shadow-sm"
            onClick={() => saveSettings.mutate(undefined)}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? "保存中..." : "保存更改"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left nav */}
        <div className="md:col-span-3">
          <nav className="flex flex-col gap-0.5">
            {tabs.map(tab => {
              const href = tab.key === "general"
                ? `/${activeTenant}/settings`
                : `/${activeTenant}/settings/${tab.key}`
              const isActive = tab.key === "general" ? isGeneral : !isGeneral
              return (
                <Link
                  key={tab.key}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground",
                  )}
                >
                  <tab.icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "opacity-50")} />
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right content */}
        <div className="md:col-span-9">
          {isGeneral ? (
            <div className="space-y-8 max-w-2xl">
              <SettingsSection icon={GitBranch} iconBg="bg-violet-50" iconColor="text-violet-600" title="版本管理">
                <FormRow
                  label="发版历史保留数量"
                  description="每个接口最多保留多少个历史版本，超出后自动清除最旧的记录。填 0 表示不限制。"
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={maxVersions}
                    onChange={e => setLocalMaxVersions(Math.max(0, Number(e.target.value)))}
                    className="h-9 text-sm w-28"
                  />
                </FormRow>
              </SettingsSection>
            </div>
          ) : (
            <UsersComponent />
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsSection({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 pb-3 mb-1 border-b border-border-subtle">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

function FormRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-10 py-5 border-b border-border-subtle/60 last:border-0">
      <div className="w-52 shrink-0 pt-0.5">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <p className="text-2xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
