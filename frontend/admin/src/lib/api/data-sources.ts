import {
  listDataSources,
  createDataSource,
  getDataSource,
  deleteDataSource,
  updateDataSource,
} from '@/lib/sdk'
import { wrapResponse, apiRequest } from './token'
import type { DataSource, ListQuery, PaginatedData, CreateDataSourceRequest, UpdateDataSourceRequest } from './types'

export const apiListDataSources = (slug: string, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<DataSource>>(listDataSources({ path: { slug }, query: q }))

export const apiCreateDataSource = (slug: string, req: CreateDataSourceRequest) =>
  wrapResponse<DataSource>(createDataSource({ path: { slug }, body: req }))

export const apiGetDataSource = (slug: string, datasourceId: number) =>
  wrapResponse<DataSource>(getDataSource({ path: { slug, datasourceId } }))

export const apiUpdateDataSource = (slug: string, datasourceId: number, req: UpdateDataSourceRequest) =>
  wrapResponse<DataSource>(updateDataSource({ path: { slug, datasourceId }, body: req }))

export const apiDeleteDataSource = (slug: string, datasourceId: number) =>
  wrapResponse<void>(deleteDataSource({ path: { slug, datasourceId } }))

// ── Schema and preview types ─────────────────────────────────────────────────

export type SchemaColumn = { name: string; type: string; nullable: boolean }
export type SchemaTable  = { name: string; columns: SchemaColumn[] }

// ── Non-SDK endpoints (schema / preview / test) ───────────────────────────────

export const apiGetSchema = (slug: string, datasourceId: number): Promise<SchemaTable[]> =>
  apiRequest(`/v1/tenants/${slug}/datasources/${datasourceId}/schema`)

export const apiPreviewTable = (
  slug: string,
  datasourceId: number,
  table: string,
  limit = 100,
): Promise<Record<string, unknown>[]> =>
  apiRequest(`/v1/tenants/${slug}/datasources/${datasourceId}/tables/${encodeURIComponent(table)}/preview?limit=${limit}`)

export const apiTestDatasource = (
  slug: string,
  dsn: string,
  gatewayId: number,
): Promise<{ latency_ms: number }> =>
  apiRequest(`/v1/tenants/${slug}/datasources/test`, {
    method: 'POST',
    body: JSON.stringify({ dsn, gateway_id: gatewayId }),
  })
