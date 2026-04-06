import { useQuery } from "@tanstack/react-query"
import { apiListGateways, apiDeleteGateway, apiGetGateway, apiCreateGateway, type ListQuery } from "@/lib/api-client"
import { useApiMutation } from "./useApiMutation"

export function useGateways(slug: string, q: ListQuery = {}) {
  const query = useQuery({ queryKey: ["gateways", slug, q], queryFn: () => apiListGateways(slug, q), enabled: !!slug })
  return { ...query, gateways: query.data?.list ?? [], pagination: query.data?.pagination }
}

export function useGateway(slug: string, id: number) {
  return useQuery({ queryKey: ["gateways", slug, id], queryFn: () => apiGetGateway(slug, id), enabled: !!slug && !!id })
}

export function useCreateGateway(slug: string) {
  return useApiMutation((name: string) => apiCreateGateway(slug, { name }), { successMessage: "网关创建成功", invalidateKeys: [["gateways", slug]] })
}

export function useDeleteGateway(slug: string) {
  return useApiMutation((id: number) => apiDeleteGateway(slug, id), { successMessage: "网关已删除", invalidateKeys: [["gateways", slug]] })
}
