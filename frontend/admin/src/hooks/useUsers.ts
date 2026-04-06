import { useQuery } from "@tanstack/react-query"
import { apiListUsers, apiAddUser, apiRemoveUser, apiUpdateUserRole, type ListQuery, type AddUserRequest } from "@/lib/api-client"
import { useApiMutation } from "./useApiMutation"

export function useUsers(slug: string, q: ListQuery = {}) {
  const query = useQuery({ queryKey: ["users", slug, q], queryFn: () => apiListUsers(slug, q), enabled: !!slug })
  return { ...query, users: query.data?.list ?? [], pagination: query.data?.pagination }
}

export function useAddUser(slug: string) {
  return useApiMutation((req: AddUserRequest) => apiAddUser(slug, req), { successMessage: "用户已添加", invalidateKeys: [["users", slug]] })
}

export function useRemoveUser(slug: string) {
  return useApiMutation((userId: number) => apiRemoveUser(slug, userId), { successMessage: "用户已移除", invalidateKeys: [["users", slug]] })
}

export function useUpdateUserRole(slug: string) {
  return useApiMutation(({ userId, role }: { userId: number; role: 'Admin' | 'Viewer' }) => apiUpdateUserRole(slug, userId, { role }), { successMessage: "角色已更新", invalidateKeys: [["users", slug]] })
}
