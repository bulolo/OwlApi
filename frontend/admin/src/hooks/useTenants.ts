import { useMyTenants } from "@/lib/sdk"
import type { MyTenantsParams } from "@/lib/sdk"

type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }

export function useTenants(q: ListQuery = {}) {
  const result = useMyTenants(q as MyTenantsParams)
  return { ...result, tenants: result.data?.list ?? [], pagination: result.data?.pagination }
}
