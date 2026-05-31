import {
  useMyTenants,
  getMyTenantsQueryKey,
  createTenant,
} from "@/lib/sdk"
import type { CreateTenantBody, MyTenantsParams } from "@/lib/sdk"
import { useAdminMutation } from "./useAdminMutation"

type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }

export function useTenants(q: ListQuery = {}) {
  const result = useMyTenants(q as MyTenantsParams)
  return { ...result, tenants: result.data?.list ?? [], pagination: result.data?.pagination }
}

export function useCreateTenant() {
  return useAdminMutation({
    mutationFn: (req: CreateTenantBody) => createTenant(req),
    successMsg: "组织创建成功",
    invalidateKeys: [getMyTenantsQueryKey()],
  })
}
