"use client"

import { createContext, useContext, useEffect } from "react"
import { useGetPlatformSettings } from "@/lib/sdk"
import type { PlatformSettingsResp } from "@/lib/sdk"

export interface BrandingData {
  /** true 表示已有可信数据（cookie 或 API），可安全渲染真实内容；false 时显示骨架屏 */
  isLoaded: boolean
  platformName: string
  platformTagline: string
  logoSrc: string
}

const DEFAULT: BrandingData = {
  isLoaded: false,
  platformName: "OwlAPI",
  platformTagline: "API网关平台",
  logoSrc: "/logo.svg",
}

const BrandingContext = createContext<BrandingData>(DEFAULT)

function resolve(data: PlatformSettingsResp | null | undefined): Omit<BrandingData, "isLoaded"> {
  return {
    platformName: data?.platform_name || DEFAULT.platformName,
    platformTagline: data?.platform_tagline || DEFAULT.platformTagline,
    logoSrc: data?.logo_url?.trim() || DEFAULT.logoSrc,
  }
}

export function PlatformBrandingProvider({
  initialData,
  children,
}: {
  initialData: PlatformSettingsResp | null
  children: React.ReactNode
}) {
  const { data: apiData } = useGetPlatformSettings(
    initialData
      ? { query: { initialData, initialDataUpdatedAt: 0 } }
      : undefined,
  )

  // API 数据返回后写 Cookie，供下次 SSR 读取，实现无闪跳首屏渲染
  useEffect(() => {
    if (!apiData) return
    try {
      const secure = window.location.protocol === "https:" ? "; Secure" : ""
      const value = encodeURIComponent(JSON.stringify(apiData))
      document.cookie = `owl_pb=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`
    } catch {}
  }, [apiData])

  const effective = apiData ?? initialData
  const value: BrandingData = {
    // 有 cookie（initialData）或 API 数据时立即显示真实内容，否则显示骨架
    isLoaded: !!(effective),
    ...resolve(effective),
  }

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}

export function usePlatformBranding(): BrandingData {
  return useContext(BrandingContext)
}
