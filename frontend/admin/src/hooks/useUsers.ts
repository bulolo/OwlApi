import { apiListUsers, apiAddUser, apiRemoveUser, apiUpdateUserRole, type ListQuery, type AddUserRequest } from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useUsers(slug: string, q: ListQuery = {}) {
  const result = usePaginatedQuery(["users", slug, q], () => apiListUsers(slug, q), !!slug)
  return { ...result, users: result.list }
}

export function useAddUser(slug: string) {
  return useAdminMutation({ mutationFn: (req: AddUserRequest) => apiAddUser(slug, req), successMsg: "用户已添加", invalidateKeys: [["users", slug]] })
}

export function useRemoveUser(slug: string) {
  return useAdminMutation({ mutationFn: (userId: number) => apiRemoveUser(slug, userId), successMsg: "用户已移除", invalidateKeys: [["users", slug]] })
}

export function useUpdateUserRole(slug: string) {
  return useAdminMutation({ mutationFn: ({ userId, role }: { userId: number; role: 'Admin' | 'Viewer' }) => apiUpdateUserRole(slug, userId, { role }), successMsg: "角色已更新", invalidateKeys: [["users", slug]] })
}
