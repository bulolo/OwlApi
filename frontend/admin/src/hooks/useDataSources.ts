import {
  useListDataSources, useGetDataSource, useGetDatasourceSchema, usePreviewTable,
  getListDataSourcesQueryKey,
  createDataSource, updateDataSource, deleteDataSource,
} from "@/lib/sdk"
import type { CreateDataSourceReq, UpdateDataSourceReq, ListDataSourcesParams, PreviewRow } from "@/lib/sdk"
import { useAdminMutation } from "./useAdminMutation"

type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }
export type SchemaColumn = { name: string; type: string; nullable: boolean }
export type SchemaTable = { name: string; columns: SchemaColumn[] }

export function useDataSources(slug: string, q: ListQuery = {}) {
  const result = useListDataSources(slug, q as ListDataSourcesParams, {
    query: { enabled: !!slug },
  })
  return { ...result, dataSources: result.data?.list ?? [], pagination: result.data?.pagination }
}

export function useDataSource(slug: string, id: number) {
  return useGetDataSource(slug, id, {
    query: { enabled: !!slug && !!id },
  })
}

export function useDataSourceSchema(slug: string, datasourceId: number, enabled: boolean) {
  return useGetDatasourceSchema(slug, datasourceId, {
    query: {
      enabled: enabled && !!slug && !!datasourceId,
      staleTime: 60_000,
      select: (data) => data as unknown as SchemaTable[],
    },
  })
}

export function useDataSourcePreview(
  slug: string,
  datasourceId: number,
  table: string | null,
  enabled: boolean,
) {
  return usePreviewTable(slug, datasourceId, table!, undefined, {
    query: {
      enabled: enabled && !!slug && !!datasourceId && !!table,
      staleTime: 30_000,
      select: (data: PreviewRow[]) => data as unknown as Record<string, unknown>[],
    },
  })
}

export function useCreateDataSource(slug: string) {
  return useAdminMutation({
    mutationFn: (req: CreateDataSourceReq) => createDataSource(slug, req),
    successMsg: "数据源创建成功",
    invalidateKeys: [getListDataSourcesQueryKey(slug)],
  })
}

export function useUpdateDataSource(slug: string, id: number) {
  return useAdminMutation({
    mutationFn: (req: UpdateDataSourceReq) => updateDataSource(slug, id, req),
    successMsg: "数据源已更新",
    invalidateKeys: [getListDataSourcesQueryKey(slug)],
  })
}

export function useDeleteDataSource(slug: string) {
  return useAdminMutation({
    mutationFn: (id: number) => deleteDataSource(slug, id),
    successMsg: "数据源已删除",
    invalidateKeys: [getListDataSourcesQueryKey(slug)],
  })
}
