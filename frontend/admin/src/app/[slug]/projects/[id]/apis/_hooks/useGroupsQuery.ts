import { useAdminMutation } from "@/hooks/useAdminMutation"
import { useListGroups, getListGroupsQueryKey, getListEndpointsQueryKey, createGroup, updateGroup, deleteGroup } from "@/lib/sdk"

export function useGroupsQuery(slug: string, projectId: string) {
  const result = useListGroups(slug, Number(projectId), undefined, {
    query: { enabled: !!slug && !!projectId },
  })
  return { ...result, list: result.data?.list ?? [] }
}

export function useCreateGroup(slug: string, projectId: string) {
  return useAdminMutation({
    mutationFn: (name: string) => createGroup(slug, Number(projectId), { name }),
    successMsg: "分组已创建",
    invalidateKeys: [getListGroupsQueryKey(slug, Number(projectId))],
  })
}

export function useUpdateGroup(slug: string, projectId: string) {
  return useAdminMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateGroup(slug, Number(projectId), id, { name }),
    successMsg: "分组已更新",
    invalidateKeys: [getListGroupsQueryKey(slug, Number(projectId))],
  })
}

export function useDeleteGroup(slug: string, projectId: string) {
  return useAdminMutation({
    mutationFn: (id: number) => deleteGroup(slug, Number(projectId), id),
    successMsg: "分组已删除",
    invalidateKeys: [
      getListGroupsQueryKey(slug, Number(projectId)),
      getListEndpointsQueryKey(slug, Number(projectId)),
    ],
  })
}
