"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAdminMutation } from "@/hooks"
import { Globe, GitBranch, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { apiGetTenant, apiUpdateTenantSettings } from "@/lib/api-client"
import UsersClientPage from "@/app/[slug]/users/UsersClientPage"

type SettingsTab = "general" | "users"

export default function SettingsClientPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const params = useParams()
  const slug = params.slug as string

  const { data: tenant } = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => apiGetTenant(slug),
    enabled: !!slug,
  })

  const [localMaxVersions, setLocalMaxVersions] = useState<number | null>(null)
  const maxVersions = localMaxVersions ?? tenant?.max_release_versions ?? 10

  const saveSettings = useAdminMutation({
    mutationFn: () => apiUpdateTenantSettings(slug, localMaxVersions ?? tenant?.max_release_versions ?? 10),
    successMsg: "配置已保存",
    invalidateKeys: [["tenant", slug]],
  })

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">系统设置</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">当前组织的配置与成员管理。</p>
        </div>
        {activeTab === "general" && (
          <Button
            className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
            onClick={() => saveSettings.mutate(undefined)}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? "保存中..." : "保存更改"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-3">
          <nav className="flex flex-col space-y-1">
            <SettingsTabLink icon={Globe} label="通用配置" active={activeTab === "general"} onClick={() => setActiveTab("general")} />
            <SettingsTabLink icon={Users} label="成员管理" active={activeTab === "users"} onClick={() => setActiveTab("users")} />
          </nav>
        </div>

        <div className="md:col-span-9">
          {activeTab === "general" && (
            <div className="space-y-6">
              <SettingsCard title="版本管理" icon={GitBranch} iconColor="text-violet-600">
                <div className="grid grid-cols-2 gap-6">
                  <FormItem
                    label="发版历史保留数量"
                    description="每个接口最多保留多少个历史版本，超出后自动清除最旧的记录。填 0 表示不限制。"
                  >
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={maxVersions}
                      onChange={e => setLocalMaxVersions(Math.max(0, Number(e.target.value)))}
                      className="h-9 text-xs"
                    />
                  </FormItem>
                </div>
              </SettingsCard>
            </div>
          )}

          {activeTab === "users" && (
            <UsersClientPage />
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsTabLink({ icon: Icon, label, active, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center space-x-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all",
        active
          ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-[0_1px_2px_rgba(59,130,246,0.1)]"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-blue-600" : "text-zinc-400")} />
      <span className="text-xs font-bold tracking-tight">{label}</span>
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

function FormItem({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-0.5">{label}</label>
      {children}
      <p className="text-[10px] text-zinc-400 font-medium px-0.5">{description}</p>
    </div>
  )
}
