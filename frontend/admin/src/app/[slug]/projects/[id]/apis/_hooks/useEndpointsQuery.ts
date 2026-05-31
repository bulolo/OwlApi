import { useAdminMutation } from "@/hooks/useAdminMutation"
import { useListEndpoints, getListEndpointsQueryKey, deleteEndpoint, patchEndpoint } from "@/lib/sdk"
import type { APIEndpointResp as ApiEndpoint, ListEndpointsParams } from "@/lib/sdk"

export function useEndpointsQuery(slug: string, projectId: string) {
  const result = useListEndpoints(slug, Number(projectId), { is_pager: 0 } as ListEndpointsParams, {
    query: { enabled: !!slug && !!projectId },
  })
  return { ...result, list: result.data?.list ?? [], pagination: result.data?.pagination }
}

export function useDeleteEndpoint(slug: string, projectId: string) {
  return useAdminMutation({
    mutationFn: (endpointId: number) => deleteEndpoint(slug, Number(projectId), endpointId),
    successMsg: "接口已删除",
    invalidateKeys: [getListEndpointsQueryKey(slug, Number(projectId))],
  })
}

export function useUpdateEndpointGroup(slug: string, projectId: string) {
  return useAdminMutation({
    mutationFn: ({ ep, groupId }: { ep: ApiEndpoint; groupId: number }) =>
      patchEndpoint(slug, Number(projectId), ep.id!, { group_id: groupId }),
    invalidateKeys: [getListEndpointsQueryKey(slug, Number(projectId))],
  })
}
