"use client"

import {
  Settings,
  Shield,
  Key,
  Globe,
  Bell,
  Cpu,
  Save,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export default function SettingsClientPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">系统设置</h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium italic">管理平台全局配置、安全密钥与集群参数</p>
        </div>
        <Button className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm">
          保存所有更改
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Navigation / Sections */}
        <div className="md:col-span-3">
          <nav className="flex flex-col space-y-1">
            <SettingsSectionLink icon={Globe} label="通用配置" active />
            <SettingsSectionLink icon={Shield} label="安全中心" />
            <SettingsSectionLink icon={Key} label="API 令牌" />
            <SettingsSectionLink icon={Bell} label="推送通知" />
            <SettingsSectionLink icon={Cpu} label="计算集群" />
          </nav>
        </div>

        {/* Content Area */}
        <div className="md:col-span-9 space-y-8">
          {/* General Section */}
          <section className="bg-white border rounded-lg p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-zinc-800 flex items-center">
              <Globe className="w-4 h-4 mr-2 text-blue-600" />
              通用平台配置
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">平台名称</label>
                <Input defaultValue="OwlAPI Pro Console" className="h-9 text-xs focus:ring-1" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">主域名 (Endpoint)</label>
                <Input defaultValue="api.owlapi.cloud" className="h-9 text-xs focus:ring-1" />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded border border-zinc-100">
                <div>
                  <p className="text-xs font-bold text-zinc-800">维护模式</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">启用后，所有非管理员访问将被重定向到维护页</p>
                </div>
                <Switch />
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="bg-white border rounded-lg p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-zinc-800 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-emerald-600" />
              安全性与访问控制
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-bold text-zinc-800">双重身份验证 (2FA)</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">为所有管理员账号强制启用 2FA 校验</p>
                </div>
                <Switch checked />
              </div>
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-bold text-zinc-800">IP 白名单过滤</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">仅允许指定网段的流量访问控制台</p>
                </div>
                <Switch />
              </div>
            </div>

            <div className="bg-amber-50 rounded p-4 border border-amber-100 flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-amber-800">安全警告</p>
                <p className="text-[10px] text-amber-700 leading-normal">
                  启用 IP 白名单后，如果您当前的 IP 不在范围内，可能会导致无法再次登入。请务必确认配置正确。
                </p>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 px-1">
            <Button variant="outline" className="h-9 px-6 text-xs font-bold border-zinc-200">取消</Button>
            <Button className="h-9 px-10 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-md">
              确定更新
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsSectionLink({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center space-x-3 px-4 py-2.5 rounded-md cursor-pointer transition-all",
      active
        ? "bg-blue-50 text-blue-600 border border-blue-100"
        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
    )}>
      <Icon className={cn("w-4 h-4", active ? "text-blue-600" : "text-zinc-300")} />
      <span className="text-xs font-bold tracking-tight">{label}</span>
    </div>
  )
}
