import { useHealth } from "@/lib/sdk"

export type Edition = "community" | "enterprise"

/**
 * 全局拉取 /health，从中读取 edition / is_licensed。
 *
 * 设计要点：
 *   - 不需要登录，登录页和首屏都能用
 *   - 缓存 60 秒（足够减少请求量；env 改了 + 后端重启 + 前端刷新就能拿到新值）
 *   - 默认 refetchOnWindowFocus 帮助"切回标签页"也能取到最新版本
 *   - 拿不到数据时按 community 处理，避免 EE 入口闪现
 */
export function useEdition() {
  const { data, isLoading, error } = useHealth({
    query: { staleTime: 60_000, gcTime: 5 * 60_000, retry: 1 },
  })

  if (error && typeof window !== "undefined") {
    console.warn("[useEdition] /health failed:", error)
  }

  const edition: Edition = data?.edition === "enterprise" ? "enterprise" : "community"
  return {
    edition,
    isEnterprise: edition === "enterprise",
    isCommunity: edition === "community",
    isLicensed: !!data?.is_licensed,
    /** EE 入口是否应该开放：必须是 EE 构建 + license 有效。CE 永远 false。 */
    canUseEeFeatures: edition === "enterprise" && !!data?.is_licensed,
    isLoading,
  }
}
