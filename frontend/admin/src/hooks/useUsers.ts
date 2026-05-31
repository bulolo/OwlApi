import {
  useListUsers,
  getListUsersQueryKey,
  addUser, removeUser, updateUserRole,
} from "@/lib/sdk"
import type { AddUserBody, ListUsersParams } from "@/lib/sdk"
import { useAdminMutation } from "./useAdminMutation"

type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }

export function useUsers(slug: string, q: ListQuery = {}) {
  const result = useListUsers(slug, q as ListUsersParams, {
    query: { enabled: !!slug },
  })
  return { ...result, users: result.data?.list ?? [], pagination: result.data?.pagination }
}

export function useAddUser(slug: string) {
  return useAdminMutation({
    mutationFn: (req: AddUserBody) => addUser(slug, req),
    successMsg: "用户已添加",
    invalidateKeys: [getListUsersQueryKey(slug)],
  })
}

export function useRemoveUser(slug: string) {
  return useAdminMutation({
    mutationFn: (userId: number) => removeUser(slug, userId),
    successMsg: "用户已移除",
    invalidateKeys: [getListUsersQueryKey(slug)],
  })
}

export function useUpdateUserRole(slug: string) {
  return useAdminMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'Admin' | 'Viewer' }) =>
      updateUserRole(slug, userId, { role }),
    successMsg: "角色已更新",
    invalidateKeys: [getListUsersQueryKey(slug)],
  })
}
