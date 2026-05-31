"use client"

import { useState } from "react"

import { useAdminMutation } from "@/hooks"
import { Globe, Paintbrush } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useGetPlatformSettings, updatePlatformSettings, getGetPlatformSettingsQueryKey } from "@/lib/sdk"

export default function PlatformSettings({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { data: settings } = useGetPlatformSettings()

  const [localAllowSelfRegister, setLocalAllowSelfRegister] = useState<boolean | null>(null)
  const [localPlatformName, setLocalPlatformName] = useState<string | null>(null)
  const [localPlatformTagline, setLocalPlatformTagline] = useState<string | null>(null)
  const [localLogoURL, setLocalLogoURL] = useState<string | null>(null)

  const allowSelfRegister = localAllowSelfRegister ?? settings?.allow_self_register ?? true
  const platformName = localPlatformName ?? settings?.platform_name ?? "OwlAPI"
  const platformTagline = localPlatformTagline ?? settings?.platform_tagline ?? "API网关平台"
  const logoURL = localLogoURL ?? settings?.logo_url ?? ""

  const saveSettings = useAdminMutation({
    mutationFn: () => updatePlatformSettings({
      allow_self_register: allowSelfRegister,
      platform_name: platformName,
      platform_tagline: platformTagline,
      logo_url: logoURL,
    }),
    successMsg: "平台配置已保存",
    invalidateKeys: [getGetPlatformSettingsQueryKey()],
  })

  const previewLogoSrc = logoURL.trim() || "/logo.svg"

  return (
    <div className="space-y-8 max-w-5xl">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">平台设置</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">超级管理员专属 — 全局平台配置，对所有租户生效。</p>
          </div>
          <Button
            className="h-9 px-6 text-xs font-bold shadow-sm"
            onClick={() => saveSettings.mutate(undefined)}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? "保存中..." : "保存更改"}
          </Button>
        </div>
      )}

      <SettingsCard title="品牌外观" icon={Paintbrush} iconColor="text-violet-600">
        <div className="space-y-5">
          <div className="flex items-start gap-6">
            <div className="shrink-0 w-16 h-16 rounded-xl border border-border-subtle bg-zinc-50 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewLogoSrc} alt="Logo 预览" width={48} height={48} className="object-contain" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground">平台名称</p>
                <Input
                  value={platformName}
                  onChange={(e) => setLocalPlatformName(e.target.value)}
                  placeholder="OwlAPI"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground">平台描述</p>
                <Input
                  value={platformTagline}
                  onChange={(e) => setLocalPlatformTagline(e.target.value)}
                  placeholder="API网关平台"
                  className="h-8 text-xs"
                />
                <p className="text-2xs text-muted-foreground">显示在侧边栏 Logo 下方的副标题</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground">Logo URL</p>
                <Input
                  value={logoURL}
                  onChange={(e) => setLocalLogoURL(e.target.value)}
                  placeholder="留空使用默认 Logo（/logo.svg）"
                  className="h-8 text-xs font-mono"
                />
                <p className="text-2xs text-muted-foreground">填写可公开访问的图片地址，建议正方形 PNG/SVG，尺寸 128×128 以上</p>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="注册控制" icon={Globe} iconColor="text-primary">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-xs font-bold text-foreground">允许新组织注册</p>
            <p className="text-2xs text-muted-foreground mt-0.5">开启后，登录页显示「申请注册」入口，任何人可自行创建新组织</p>
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
    <section className="bg-white border border-border-subtle rounded-lg p-6 shadow-card space-y-5">
      {Icon ? (
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg bg-zinc-50", iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
          {title}
        </h3>
      ) : (
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      )}
      {children}
    </section>
  )
}
