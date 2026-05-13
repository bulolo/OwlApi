import { useQuery } from "@tanstack/react-query"
import {
  apiListDataSources,
  apiGetDataSource,
  apiCreateDataSource,
  apiUpdateDataSource,
  apiDeleteDataSource,
  apiGetSchema,
  apiPreviewTable,
  type SchemaTable,
} from "@/lib/api-client"
import type { ListQuery, CreateDataSourceRequest, UpdateDataSourceRequest } from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useDataSources(slug: string, q: ListQuery = {}) {
  const result = usePaginatedQuery(["datasources", slug, q], () => apiListDataSources(slug, q), !!slug)
  return { ...result, dataSources: result.list }
}

export function useDataSource(slug: string, id: number) {
  return useQuery({
    queryKey: ["datasources", slug, id],
    queryFn: () => apiGetDataSource(slug, id),
    enabled: !!slug && !!id,
  })
}

export function useDataSourceSchema(slug: string, datasourceId: number, enabled: boolean) {
  return useQuery<SchemaTable[]>({
    queryKey: ["ds-schema", slug, datasourceId],
    queryFn: () => apiGetSchema(slug, datasourceId),
    enabled: enabled && !!slug && !!datasourceId,
    staleTime: 60_000,
  })
}

export function useDataSourcePreview(
  slug: string,
  datasourceId: number,
  table: string | null,
  enabled: boolean,
) {
  return useQuery<Record<string, unknown>[]>({
    queryKey: ["ds-preview", slug, datasourceId, table],
    queryFn: () => apiPreviewTable(slug, datasourceId, table!),
    enabled: enabled && !!slug && !!datasourceId && !!table,
    staleTime: 30_000,
  })
}

export function useCreateDataSource(slug: string) {
  return useAdminMutation({
    mutationFn: (req: CreateDataSourceRequest) => apiCreateDataSource(slug, req),
    successMsg: "数据源创建成功",
    invalidateKeys: [["datasources", slug]],
  })
}

export function useUpdateDataSource(slug: string, id: number) {
  return useAdminMutation({
    mutationFn: (req: UpdateDataSourceRequest) => apiUpdateDataSource(slug, id, req),
    successMsg: "数据源已更新",
    invalidateKeys: [["datasources", slug]],
  })
}

export function useDeleteDataSource(slug: string) {
  return useAdminMutation({
    mutationFn: (id: number) => apiDeleteDataSource(slug, id),
    successMsg: "数据源已删除",
    invalidateKeys: [["datasources", slug]],
  })
}
