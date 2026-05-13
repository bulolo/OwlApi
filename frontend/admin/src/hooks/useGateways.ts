import { useQuery } from "@tanstack/react-query"
import { apiListGateways, apiDeleteGateway, apiGetGateway, apiCreateGateway, type ListQuery } from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useGateways(slug: string, q: ListQuery = {}) {
  const result = usePaginatedQuery(["gateways", slug, q], () => apiListGateways(slug, q), !!slug)
  return { ...result, gateways: result.list }
}

export function useGateway(slug: string, id: number) {
  return useQuery({ queryKey: ["gateways", slug, id], queryFn: () => apiGetGateway(slug, id), enabled: !!slug && !!id })
}

export function useCreateGateway(slug: string) {
  return useAdminMutation({ mutationFn: (name: string) => apiCreateGateway(slug, { name }), successMsg: "网关创建成功", invalidateKeys: [["gateways", slug]] })
}

export function useDeleteGateway(slug: string) {
  return useAdminMutation({ mutationFn: (id: number) => apiDeleteGateway(slug, id), successMsg: "网关已删除", invalidateKeys: [["gateways", slug]] })
}
