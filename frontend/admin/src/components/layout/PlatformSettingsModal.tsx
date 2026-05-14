"use client"

import { useState } from "react"
import { Building2, Settings, ShieldCheck, X, Save, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useAdminMutation } from "@/hooks"
import { useQuery } from "@tanstack/react-query"
import { apiGetPlatformSettings, apiUpdatePlatformSettings } from "@/lib/api-client"
import Tenants from "@/app/[slug]/tenants/Tenants"
import * as DialogPrimitive from "@radix-ui/react-dialog"

type Tab = "tenants" | "settings"

const tabs: { key: Tab; icon: React.ComponentType<{ className?: string }>; label: string; group: string }[] = [
  { key: "tenants",  icon: Building2, label: "组织管理", group: "资源" },
  { key: "settings", icon: Settings,  label: "全局配置", group: "配置" },
]

interface PlatformSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PlatformSettingsModal({ open, onOpenChange }: PlatformSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tenants")

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: apiGetPlatformSettings,
  })
  const [localAllowSelfRegister, setLocalAllowSelfRegister] = useState<boolean | null>(null)
  const allowSelfRegister = localAllowSelfRegister ?? settings?.allow_self_register ?? true

  const saveSettings = useAdminMutation({
    mutationFn: () => apiUpdatePlatformSettings({ allow_self_register: allowSelfRegister }),
    successMsg: "平台配置已保存",
    invalidateKeys: [["platform-settings"]],
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
          <DialogPrimitive.Title className="sr-only">平台设置</DialogPrimitive.Title>

          {/* Window Header */}
          <div className="h-14 px-5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-sm font-bold text-foreground">平台设置</h2>
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
                {activeTab === "tenants"  && <Tenants />}
                {activeTab === "settings" && (
                  <GlobalConfigPanel
                    allowSelfRegister={allowSelfRegister}
                    onAllowSelfRegisterChange={setLocalAllowSelfRegister}
                    onSave={() => saveSettings.mutate(undefined)}
                    isSaving={saveSettings.isPending}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function GlobalConfigPanel({
  allowSelfRegister,
  onAllowSelfRegisterChange,
  onSave,
  isSaving,
}: {
  allowSelfRegister: boolean
  onAllowSelfRegisterChange: (v: boolean) => void
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <div className="space-y-6">
      <ConfigCard title="注册控制" icon={KeyRound} iconBg="bg-amber-50" iconColor="text-amber-600">
        <ConfigRow
          label="允许新组织注册"
          description="开启后，登录页显示「申请注册」入口，任何人可自行创建新组织"
        >
          <Switch
            checked={allowSelfRegister}
            onCheckedChange={onAllowSelfRegisterChange}
          />
        </ConfigRow>
      </ConfigCard>

      <div className="flex justify-end">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="h-9 px-5 text-xs font-bold"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {isSaving ? "保存中..." : "保存更改"}
        </Button>
      </div>
    </div>
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
        <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="divide-y divide-border-subtle">
        {children}
      </div>
    </section>
  )
}

function ConfigRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex-1 mr-8">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      {children}
    </div>
  )
}
