import {
  listDataSources,
  createDataSource,
  getDataSource,
  deleteDataSource,
  updateDataSource,
  getDatasourceSchema,
  previewTable,
  testDatasource,
} from '@/lib/sdk'
import { wrapResponse } from './token'
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

export const apiGetSchema = (slug: string, datasourceId: number): Promise<SchemaTable[]> =>
  wrapResponse<SchemaTable[]>(getDatasourceSchema({ path: { slug, datasourceId } }))

export const apiPreviewTable = (
  slug: string,
  datasourceId: number,
  table: string,
  limit = 100,
): Promise<Record<string, unknown>[]> =>
  wrapResponse<Record<string, unknown>[]>(previewTable({ path: { slug, datasourceId, table }, query: { limit } }))

export const apiTestDatasource = (
  slug: string,
  dsn: string,
  gatewayId: number,
): Promise<{ latency_ms: number }> =>
  wrapResponse<{ latency_ms: number }>(testDatasource({ path: { slug }, body: { dsn, gateway_id: gatewayId } }))
