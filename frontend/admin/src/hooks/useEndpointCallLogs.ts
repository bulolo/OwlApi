import { useQuery } from "@tanstack/react-query"
import { apiListEndpointCallLogs, type CallLogQuery } from "@/lib/api-client"

/**
 * 拉取接口调用日志。
 * - 默认每 30s 自动 refetch 一次（可通过 autoRefresh 关掉）
 * - filter 任何字段变化都会触发新请求
 */
export function useEndpointCallLogs(
  slug: string,
  projectId: number,
  endpointId: number,
  q: CallLogQuery,
  autoRefresh = true,
) {
  const result = useQuery({
    queryKey: ["endpoint-call-logs", slug, projectId, endpointId, q],
    queryFn: () => apiListEndpointCallLogs(slug, projectId, endpointId, q),
    enabled: !!slug && !!projectId && !!endpointId,
    refetchInterval: autoRefresh ? 30_000 : false,
    staleTime: 5_000,
  })
  return {
    ...result,
    logs: result.data?.list ?? [],
    total: result.data?.pagination?.total ?? 0,
  }
}
