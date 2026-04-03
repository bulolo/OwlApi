"use client"

import { useState } from "react"
import { Building2, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import TenantsClientPage from "@/app/[slug]/tenants/TenantsClientPage"
import SettingsClientPage from "@/app/[slug]/settings/SettingsClientPage"

interface PlatformSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Tab = "tenants" | "settings"

export default function PlatformSettingsModal({ open, onOpenChange }: PlatformSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tenants")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-xl">
        <DialogTitle className="sr-only">平台设置</DialogTitle>
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col">
            <div className="p-6 pb-4 border-b border-zinc-200/50">
              <h2 className="text-sm font-bold text-zinc-900 tracking-tight">平台管理</h2>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Platform Administration</p>
            </div>
            
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              <div className="px-3 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">资源</div>
              <button
                onClick={() => setActiveTab("tenants")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === "tenants"
                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-zinc-200"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <Building2 className={cn("w-4 h-4", activeTab === "tenants" ? "text-blue-500" : "text-zinc-400")} />
                租户管理
              </button>

              <div className="px-3 py-2 mt-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">配置</div>
              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === "settings"
                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-zinc-200"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <Settings className={cn("w-4 h-4", activeTab === "settings" ? "text-blue-500" : "text-zinc-400")} />
                全局配置
              </button>
            </nav>
          </div>

          {/* Right Content */}
          <div className="flex-1 bg-white flex flex-col min-w-0">
             <div className="flex-1 overflow-y-auto p-8">
               {activeTab === "tenants" && <TenantsClientPage />}
               {activeTab === "settings" && <SettingsClientPage />}
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
