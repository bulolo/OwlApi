import { useQuery } from "@tanstack/react-query"
import { apiListTenants, apiCreateTenant, type ListQuery, type CreateTenantRequest } from "@/lib/api-client"
import { useApiMutation } from "./useApiMutation"

export function useTenants(q: ListQuery = {}) {
  const query = useQuery({ queryKey: ["tenants", q], queryFn: () => apiListTenants(q), enabled: true })
  return { ...query, tenants: query.data?.list ?? [], pagination: query.data?.pagination }
}

export function useCreateTenant() {
  return useApiMutation((req: CreateTenantRequest) => apiCreateTenant(req), { successMessage: "租户创建成功", invalidateKeys: [["tenants"]] })
}
