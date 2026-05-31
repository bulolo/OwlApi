import {
  useListGateways, useGetGateway,
  getListGatewaysQueryKey,
  createGateway, deleteGateway,
} from "@/lib/sdk"
import type { ListGatewaysParams } from "@/lib/sdk"
import { useAdminMutation } from "./useAdminMutation"

type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }

export function useGateways(slug: string, q: ListQuery = {}) {
  const result = useListGateways(slug, q as ListGatewaysParams, {
    query: { enabled: !!slug },
  })
  return { ...result, gateways: result.data?.list ?? [], pagination: result.data?.pagination }
}

export function useGateway(slug: string, id: number) {
  return useGetGateway(slug, id, {
    query: { enabled: !!slug && !!id },
  })
}

export function useCreateGateway(slug: string) {
  return useAdminMutation({
    mutationFn: (name: string) => createGateway(slug, { name }),
    successMsg: "网关创建成功",
    invalidateKeys: [getListGatewaysQueryKey(slug)],
  })
}

export function useDeleteGateway(slug: string) {
  return useAdminMutation({
    mutationFn: (id: number) => deleteGateway(slug, id),
    successMsg: "网关已删除",
    invalidateKeys: [getListGatewaysQueryKey(slug)],
  })
}
