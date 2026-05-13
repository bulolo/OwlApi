import { apiListTenants, apiCreateTenant, type ListQuery, type CreateTenantRequest } from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useTenants(q: ListQuery = {}) {
  const result = usePaginatedQuery(["tenants", q], () => apiListTenants(q))
  return { ...result, tenants: result.list }
}

export function useCreateTenant() {
  return useAdminMutation({ mutationFn: (req: CreateTenantRequest) => apiCreateTenant(req), successMsg: "组织创建成功", invalidateKeys: [["tenants"]] })
}
