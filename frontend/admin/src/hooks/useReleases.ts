import { apiListReleases, apiPublishEndpoint, apiActivateRelease, apiUnpublishEndpoint, type ListQuery } from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useReleases(slug: string, projectId: number, endpointId: number, q: ListQuery = {}) {
  const result = usePaginatedQuery(
    ["releases", slug, projectId, endpointId, q],
    () => apiListReleases(slug, projectId, endpointId, q),
    !!slug && !!projectId && !!endpointId,
  )
  return { ...result, releases: result.list }
}

export function usePublishEndpoint(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (note: string) => apiPublishEndpoint(slug, projectId, endpointId, note),
    successMsg: "发版成功",
    invalidateKeys: [["releases", slug, projectId, endpointId]],
  })
}

export function useUnpublishEndpoint(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation<void, Error, void>({
    mutationFn: () => apiUnpublishEndpoint(slug, projectId, endpointId),
    successMsg: "接口已下线",
    invalidateKeys: [
      ["releases", slug, projectId, endpointId],
      ["endpoints", slug, projectId],
    ],
  })
}

export function useActivateRelease(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (releaseId: number) => apiActivateRelease(slug, projectId, endpointId, releaseId),
    successMsg: "已回滚到指定版本",
    invalidateKeys: [
      ["releases", slug, projectId, endpointId],
      ["endpoints", slug, projectId],
    ],
  })
}
