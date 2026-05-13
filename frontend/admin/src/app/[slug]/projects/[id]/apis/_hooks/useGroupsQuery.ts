import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { apiListGroups, apiCreateGroup, apiUpdateGroup, apiDeleteGroup } from "@/lib/api-client"

export function useGroupsQuery(slug: string, projectId: string) {
  return usePaginatedQuery(
    ["groups", slug, projectId],
    () => apiListGroups(slug, Number(projectId)),
    !!slug && !!projectId,
  )
}

export function useCreateGroup(slug: string, projectId: string) {
  return useAdminMutation({
    mutationFn: (name: string) => apiCreateGroup(slug, Number(projectId), { name }),
    successMsg: "分组已创建",
    invalidateKeys: [["groups", slug, projectId]],
  })
}

export function useUpdateGroup(slug: string, projectId: string) {
  return useAdminMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => apiUpdateGroup(slug, Number(projectId), id, { name }),
    successMsg: "分组已更新",
    invalidateKeys: [["groups", slug, projectId]],
  })
}

export function useDeleteGroup(slug: string, projectId: string) {
  return useAdminMutation({
    mutationFn: (id: number) => apiDeleteGroup(slug, Number(projectId), id),
    successMsg: "分组已删除",
    invalidateKeys: [
      ["groups", slug, projectId],
      ["endpoints", slug, projectId],
    ],
  })
}
