"use client"

/**
 * useTenantProject — 从 URL 获取 tenant/project 信息的便捷 hook
 *
 * 消除各组件中重复的 useParams() + useUIStore() 逻辑
 */
import { useParams } from "next/navigation"
import { useUIStore } from "@/store/useUIStore"

export function useTenantProject() {
  const params = useParams()
  const slug = params.slug as string
  const projectId = params.id as string
  const storeTenant = useUIStore(s => s.activeTenant)
  const activeTenant = slug || storeTenant

  return { slug, projectId, activeTenant }
}
