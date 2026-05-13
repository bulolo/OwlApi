"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAdminMutation } from "@/hooks"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { apiGetPlatformSettings, apiUpdatePlatformSettings } from "@/lib/api-client"

export default function PlatformSettingsClientPage() {
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
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">平台设置</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">超级管理员专属 — 全局平台配置，对所有租户生效。</p>
        </div>
        <Button
          className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
          onClick={() => saveSettings.mutate(undefined)}
          disabled={saveSettings.isPending}
        >
          {saveSettings.isPending ? "保存中..." : "保存更改"}
        </Button>
      </div>

      <SettingsCard title="注册控制" icon={Globe} iconColor="text-blue-600">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-xs font-bold text-zinc-800">允许新组织注册</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">开启后，登录页显示「申请注册」入口，任何人可自行创建新组织</p>
          </div>
          <Switch
            checked={allowSelfRegister}
            onCheckedChange={setLocalAllowSelfRegister}
          />
        </div>
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ title, children, icon: Icon, iconColor }: { title: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; iconColor?: string }) {
  return (
    <section className="bg-white border border-zinc-100 rounded-lg p-6 shadow-sm space-y-5">
      {Icon ? (
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg bg-zinc-50", iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
          {title}
        </h3>
      ) : (
        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
      )}
      {children}
    </section>
  )
}
