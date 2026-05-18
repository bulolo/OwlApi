import { useQuery } from "@tanstack/react-query"
import {
  apiListEndpointVersions,
  apiListEndpointActives,
  apiActivateEndpointVersion,
  apiCreateEndpointVersion,
  apiUnpublishEndpoint,
  apiListEndpointActivationLog,
  apiDeleteEndpointVersion,
  apiRevertEndpointToActive,
  type ListQuery,
  type EndpointActiveVersion,
} from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

const versionsKey = (slug: string, projectId: number, endpointId: number) =>
  ["endpoint-versions", slug, projectId, endpointId] as const
const activesKey = (slug: string, projectId: number, endpointId: number) =>
  ["endpoint-actives", slug, projectId, endpointId] as const
const logKey = (slug: string, projectId: number, endpointId: number) =>
  ["endpoint-activation-log", slug, projectId, endpointId] as const
const endpointsKey = (slug: string, projectId: number) =>
  ["endpoints", slug, String(projectId)] as const

export function useEndpointVersions(slug: string, projectId: number, endpointId: number, q: ListQuery = {}) {
  const result = usePaginatedQuery(
    [...versionsKey(slug, projectId, endpointId), q],
    () => apiListEndpointVersions(slug, projectId, endpointId, q),
    !!slug && !!projectId && !!endpointId,
  )
  return { ...result, versions: result.list }
}

export function useEndpointActives(slug: string, projectId: number, endpointId: number) {
  return useQuery<EndpointActiveVersion[]>({
    queryKey: activesKey(slug, projectId, endpointId),
    // 后端 nil slice 会序列化成 JSON `null`，这里兜底成 []，调用方就不用每次 `?? []` 了。
    queryFn: async () => (await apiListEndpointActives(slug, projectId, endpointId)) ?? [],
    enabled: !!slug && !!projectId && !!endpointId,
  })
}

export function useCreateEndpointVersion(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (note: string) => apiCreateEndpointVersion(slug, projectId, endpointId, note),
    successMsg: "版本已创建",
    invalidateKeys: [versionsKey(slug, projectId, endpointId)],
  })
}

export function useUnpublishEndpoint(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (envId: number) => apiUnpublishEndpoint(slug, projectId, endpointId, envId),
    successMsg: "接口已在该环境下线",
    invalidateKeys: [
      versionsKey(slug, projectId, endpointId),
      activesKey(slug, projectId, endpointId),
      logKey(slug, projectId, endpointId),
      endpointsKey(slug, projectId),
    ],
  })
}

export function useEndpointActivationLog(slug: string, projectId: number, endpointId: number, q: ListQuery = {}) {
  const result = usePaginatedQuery(
    ["endpoint-activation-log", slug, projectId, endpointId, q],
    () => apiListEndpointActivationLog(slug, projectId, endpointId, q),
    !!slug && !!projectId && !!endpointId,
  )
  return { ...result, logs: result.list }
}

export function useRevertEndpointToActive(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (envId: number) => apiRevertEndpointToActive(slug, projectId, endpointId, envId),
    successMsg: "已还原到线上版本",
    invalidateKeys: [
      versionsKey(slug, projectId, endpointId),
      logKey(slug, projectId, endpointId),
      endpointsKey(slug, projectId),
    ],
  })
}

export function useDeleteEndpointVersion(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (versionId: number) => apiDeleteEndpointVersion(slug, projectId, endpointId, versionId),
    successMsg: "版本已删除",
    invalidateKeys: [
      versionsKey(slug, projectId, endpointId),
      logKey(slug, projectId, endpointId),
      endpointsKey(slug, projectId),
    ],
  })
}

export function useActivateEndpointVersion(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: ({ versionId, envId }: { versionId: number; envId: number }) =>
      apiActivateEndpointVersion(slug, projectId, endpointId, versionId, envId),
    successMsg: "已切换到此版本",
    invalidateKeys: [
      versionsKey(slug, projectId, endpointId),
      activesKey(slug, projectId, endpointId),
      logKey(slug, projectId, endpointId),
      endpointsKey(slug, projectId),
    ],
  })
}
