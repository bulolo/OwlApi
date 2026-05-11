import { apiListReleases, apiPublishEndpoint, apiActivateRelease, apiUnpublishEndpoint, type ListQuery } from "@/lib/api-client"
import { useApiMutation } from "./useApiMutation"
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
  return useApiMutation(
    (note: string) => apiPublishEndpoint(slug, projectId, endpointId, note),
    { successMessage: "发版成功", invalidateKeys: [["releases", slug, projectId, endpointId]] },
  )
}

export function useUnpublishEndpoint(slug: string, projectId: number, endpointId: number) {
  return useApiMutation<void, void>(
    () => apiUnpublishEndpoint(slug, projectId, endpointId),
    {
      successMessage: "接口已下线",
      invalidateKeys: [
        ["releases", slug, projectId, endpointId],
        ["endpoints", slug, projectId],
      ],
    },
  )
}

export function useActivateRelease(slug: string, projectId: number, endpointId: number) {
  return useApiMutation(
    (releaseId: number) => apiActivateRelease(slug, projectId, endpointId, releaseId),
    {
      successMessage: "已回滚到指定版本",
      invalidateKeys: [
        ["releases", slug, projectId, endpointId],
        ["endpoints", slug, projectId],
      ],
    },
  )
}
