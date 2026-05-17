"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAdminMutation } from "@/hooks"
import { Globe, GitBranch, Users, Settings, X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { apiGetTenant, apiUpdateTenantSettings } from "@/lib/api-client"
import UsersComponent from "@/app/[slug]/users/Users"
import * as DialogPrimitive from "@radix-ui/react-dialog"

type Tab = "users" | "general"

const tabs: { key: Tab; icon: React.ComponentType<{ className?: string }>; label: string; group: string }[] = [
  { key: "users",   icon: Users,  label: "成员管理", group: "成员" },
  { key: "general", icon: Globe,  label: "通用配置", group: "配置" },
]

interface TenantSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function TenantSettingsModal({ open, onOpenChange }: TenantSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("users")
  const params = useParams()
  const slug = (params?.slug as string) ?? ""

  const { data: tenant } = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => apiGetTenant(slug),
    enabled: !!slug && open,
  })

  const [localMaxVersions, setLocalMaxVersions] = useState<number | null>(null)
  const maxVersions = localMaxVersions ?? tenant?.max_release_versions ?? 5

  const saveSettings = useAdminMutation({
    mutationFn: () =>
      apiUpdateTenantSettings(slug, localMaxVersions ?? tenant?.max_release_versions ?? 5),
    successMsg: "配置已保存",
    invalidateKeys: [["tenant", slug]],
  })

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-[1200px] max-w-[95vw] h-[85vh] min-h-[560px]",
            "bg-white rounded-2xl shadow-modal border border-border/60",
            "flex flex-col overflow-hidden",
            "animate-in zoom-in-95 slide-in-from-top-2 duration-200",
          )}
        >
          <DialogPrimitive.Title className="sr-only">系统设置</DialogPrimitive.Title>

          {/* Window Header */}
          <div className="h-14 px-5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-bold text-foreground">系统设置</h2>
            </div>

            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Window Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-56 shrink-0 bg-muted/60 border-r border-border-subtle flex flex-col p-3">
              {tabs.map((tab, i) => {
                const showGroup = i === 0 || tab.group !== tabs[i - 1].group
                return (
                  <div key={tab.key}>
                    {showGroup && (
                      <div className="px-3 pt-3 pb-1.5 text-2xs font-black text-muted-foreground uppercase tracking-widest">
                        {tab.group}
                      </div>
                    )}
                    <button
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                        activeTab === tab.key
                          ? "bg-white text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
                      )}
                    >
                      <tab.icon className={cn("h-4 w-4 opacity-70", activeTab === tab.key && "text-primary opacity-100")} />
                      {tab.label}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Right Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="p-8 max-w-5xl">
                {activeTab === "users" && <UsersComponent />}

                {activeTab === "general" && (
                  <div className="space-y-6">
                    <ConfigCard title="版本管理" icon={GitBranch} iconColor="text-violet-600" iconBg="bg-violet-50">
                      <ConfigRow
                        label="发版历史保留数量"
                        description="每个接口最多保留多少个历史版本，超出后自动清除最旧的记录。填 0 表示不限制。"
                      >
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={maxVersions}
                          onChange={e => setLocalMaxVersions(Math.max(0, Number(e.target.value)))}
                          className="h-9 text-sm w-28 text-right"
                        />
                      </ConfigRow>
                    </ConfigCard>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => saveSettings.mutate(undefined)}
                        disabled={saveSettings.isPending}
                        className="h-9 px-5 text-xs font-bold"
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {saveSettings.isPending ? "保存中..." : "保存更改"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ConfigCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  iconColor?: string
  iconBg?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white border border-border-subtle rounded-lg shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border-subtle bg-zinc-50/50 flex items-center gap-2">
        {Icon && iconBg && (
          <div className={cn("w-5 h-5 rounded flex items-center justify-center", iconBg)}>
            <Icon className={cn("w-3 h-3", iconColor)} />
          </div>
        )}
        <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">{title}</h3>
      </div>
      <div className="divide-y divide-border-subtle">
        {children}
      </div>
    </section>
  )
}

function ConfigRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex-1 mr-8">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      {children}
    </div>
  )
}
