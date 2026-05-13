"use client"

/**
 * useTenantProject — 从 URL 获取 tenant/project 信息的便捷 hook
 *
 * 消除各组件中重复的 useParams() + useTenant() 逻辑
 */
import { useParams } from "next/navigation"
import { useTenant } from "@/providers/TenantProvider"

export function useTenantProject() {
  const params = useParams()
  const slug = params?.slug as string | undefined
  const projectId: string = (params?.id as string | undefined) ?? ""
  const contextTenant = useTenant()
  const activeTenant: string = slug || contextTenant || ""

  return { slug, projectId, activeTenant }
}
