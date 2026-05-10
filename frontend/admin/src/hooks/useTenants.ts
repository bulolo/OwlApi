import { apiListTenants, apiCreateTenant, type ListQuery, type CreateTenantRequest } from "@/lib/api-client"
import { useApiMutation } from "./useApiMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useTenants(q: ListQuery = {}) {
  const result = usePaginatedQuery(["tenants", q], () => apiListTenants(q))
  return { ...result, tenants: result.list }
}

export function useCreateTenant() {
  return useApiMutation((req: CreateTenantRequest) => apiCreateTenant(req), { successMessage: "组织创建成功", invalidateKeys: [["tenants"]] })
}
