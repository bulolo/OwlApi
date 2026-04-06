import { useQuery } from "@tanstack/react-query"
import { apiListDataSources, apiGetDataSource, apiCreateDataSource, apiUpdateDataSource, apiDeleteDataSource, type ListQuery, type CreateDataSourceRequest, type UpdateDataSourceRequest } from "@/lib/api-client"
import { useApiMutation } from "./useApiMutation"

export function useDataSources(slug: string, q: ListQuery = {}) {
  const query = useQuery({ queryKey: ["datasources", slug, q], queryFn: () => apiListDataSources(slug, q), enabled: !!slug })
  return { ...query, dataSources: query.data?.list ?? [], pagination: query.data?.pagination }
}

export function useDataSource(slug: string, id: number) {
  return useQuery({ queryKey: ["datasources", slug, id], queryFn: () => apiGetDataSource(slug, id), enabled: !!slug && !!id })
}

export function useCreateDataSource(slug: string) {
  return useApiMutation((req: CreateDataSourceRequest) => apiCreateDataSource(slug, req), { successMessage: "数据源创建成功", invalidateKeys: [["datasources", slug]] })
}

export function useUpdateDataSource(slug: string, id: number) {
  return useApiMutation((req: UpdateDataSourceRequest) => apiUpdateDataSource(slug, id, req), { successMessage: "数据源已更新", invalidateKeys: [["datasources", slug]] })
}

export function useDeleteDataSource(slug: string) {
  return useApiMutation((id: number) => apiDeleteDataSource(slug, id), { successMessage: "数据源已删除", invalidateKeys: [["datasources", slug]] })
}
