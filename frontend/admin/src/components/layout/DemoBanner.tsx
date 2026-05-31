"use client"

import { ShieldAlert } from "lucide-react"
import { useGetTenant } from "@/lib/sdk"
import { useTenant } from "@/providers/TenantProvider"

export function DemoBanner() {
  const slug = useTenant()
  const { data: tenant } = useGetTenant(slug, {
    query: { enabled: !!slug },
  })

  // is_demo 由后端计算（EE 查 tenant_ee_configs.plan==Demo；CE 恒 false）。
  if (!tenant?.is_demo) return null

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-8 py-2 flex items-center gap-2">
      <ShieldAlert className="w-3.5 h-3.5 text-orange-500 shrink-0" />
      <p className="text-xs text-orange-700">
        当前处于<span className="font-bold">演示模式</span>：接口、数据源等资源均为示例数据，部分修改操作已被限制。
      </p>
    </div>
  )
}
