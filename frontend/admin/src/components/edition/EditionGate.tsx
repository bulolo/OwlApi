"use client"

import { useEdition } from "@/hooks/useEdition"

/**
 * 仅在企业版且 license 有效时才渲染 children。
 * 用法：<EeOnly><PlatformAdminLink/></EeOnly>
 */
export function EeOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { canUseEeFeatures, isLoading } = useEdition()
  // 加载中不闪现，避免 EE 入口短暂出现又消失
  if (isLoading) return null
  return canUseEeFeatures ? <>{children}</> : <>{fallback}</>
}

/**
 * 仅在社区版（或 EE 但 license 未授权）时渲染 children。
 * 主要给"升级到企业版"这类提示用。
 */
export function CeOnly({ children }: { children: React.ReactNode }) {
  const { canUseEeFeatures, isLoading } = useEdition()
  if (isLoading) return null
  return canUseEeFeatures ? null : <>{children}</>
}
