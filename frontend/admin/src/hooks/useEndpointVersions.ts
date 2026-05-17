import {
  apiListEndpointVersions,
  apiPublishEndpoint,
  apiActivateEndpointVersion,
  apiCreateEndpointVersion,
  apiUnpublishEndpoint,
  apiListEndpointActivationLog,
  apiDeleteEndpointVersion,
  apiRevertEndpointToActive,
  type ListQuery,
} from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

// 注意：useEndpointsQuery 用 string projectId 注册查询（"1"），所以这里
// 失效时也要用 string，否则 1 !== "1"，React Query 不会匹配上、UI 不刷新。
const versionsKey = (slug: string, projectId: number, endpointId: number) =>
  ["endpoint-versions", slug, projectId, endpointId] as const
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

export function usePublishEndpoint(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (note: string) => apiPublishEndpoint(slug, projectId, endpointId, note),
    successMsg: "已发布上线",
    invalidateKeys: [
      versionsKey(slug, projectId, endpointId),
      logKey(slug, projectId, endpointId),
      endpointsKey(slug, projectId),
    ],
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
  return useAdminMutation<void, Error, void>({
    mutationFn: () => apiUnpublishEndpoint(slug, projectId, endpointId),
    successMsg: "接口已下线",
    invalidateKeys: [
      versionsKey(slug, projectId, endpointId),
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
  return useAdminMutation<void, Error, void>({
    mutationFn: () => apiRevertEndpointToActive(slug, projectId, endpointId),
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
    mutationFn: (versionId: number) => apiActivateEndpointVersion(slug, projectId, endpointId, versionId),
    successMsg: "已切换到此版本",
    invalidateKeys: [
      versionsKey(slug, projectId, endpointId),
      logKey(slug, projectId, endpointId),
      endpointsKey(slug, projectId),
    ],
  })
}
