import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import { useApiMutation } from "@/hooks/useApiMutation"
import {
  apiListEndpoints,
  apiDeleteEndpoint,
  apiPublishEndpoint,
  apiUnpublishEndpoint,
  apiUpdateEndpoint,
} from "@/lib/api-client"
import type { ApiEndpoint } from "@/lib/api-client"

export function useEndpointsQuery(slug: string, projectId: string) {
  return usePaginatedQuery(
    ["endpoints", slug, projectId],
    () => apiListEndpoints(slug, Number(projectId)),
    !!slug && !!projectId,
  )
}

export function useDeleteEndpoint(slug: string, projectId: string) {
  return useApiMutation(
    (endpointId: number) => apiDeleteEndpoint(slug, Number(projectId), endpointId),
    {
      successMessage: "接口已删除",
      invalidateKeys: [["endpoints", slug, projectId]],
    },
  )
}

export function usePublishEndpointMutation(slug: string, projectId: string, endpointId: number) {
  return useApiMutation(
    () => apiPublishEndpoint(slug, Number(projectId), endpointId),
    {
      successMessage: "接口已上线",
      invalidateKeys: [
        ["endpoints", slug, projectId],
        ["releases", slug, Number(projectId), endpointId],
      ],
    },
  )
}

export function useUnpublishEndpointMutation(slug: string, projectId: string, endpointId: number) {
  return useApiMutation<void, void>(
    () => apiUnpublishEndpoint(slug, Number(projectId), endpointId),
    {
      successMessage: "接口已下线",
      invalidateKeys: [
        ["endpoints", slug, projectId],
        ["releases", slug, Number(projectId), endpointId],
      ],
    },
  )
}

export function useUpdateEndpointGroup(slug: string, projectId: string) {
  return useApiMutation(
    ({ ep, groupId }: { ep: ApiEndpoint; groupId: number }) =>
      apiUpdateEndpoint(slug, Number(projectId), ep.id!, {
        path: ep.path ?? "",
        methods: (ep.methods ?? []) as string[],
        sql: ep.sql ?? "",
        datasource_id: ep.datasource_id ?? 0,
        pre_script_id: ep.pre_script_id ?? 0,
        post_script_id: ep.post_script_id ?? 0,
        param_defs: ep.param_defs ?? [],
        group_id: groupId,
      }),
    { invalidateKeys: [["endpoints", slug, projectId]] },
  )
}
