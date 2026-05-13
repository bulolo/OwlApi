import {
  listDataSources,
  createDataSource,
  getDataSource,
  deleteDataSource,
  updateDataSource,
} from '@/lib/sdk'
import { getToken } from './token'
import type { DataSource, ListQuery, PaginatedData, CreateDataSourceRequest, UpdateDataSourceRequest } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListDataSources = (slug: string, q: ListQuery = {}) =>
  listDataSources({ path: { slug }, query: q }) as unknown as Promise<PaginatedData<DataSource>>

export const apiCreateDataSource = (slug: string, req: CreateDataSourceRequest) =>
  createDataSource({ path: { slug }, body: req }) as unknown as Promise<DataSource>

export const apiGetDataSource = (slug: string, datasourceId: number) =>
  getDataSource({ path: { slug, datasourceId } }) as unknown as Promise<DataSource>

export const apiUpdateDataSource = (slug: string, datasourceId: number, req: UpdateDataSourceRequest) =>
  updateDataSource({ path: { slug, datasourceId }, body: req }) as unknown as Promise<DataSource>

export const apiDeleteDataSource = (slug: string, datasourceId: number) =>
  deleteDataSource({ path: { slug, datasourceId } }) as unknown as Promise<void>

// ── Schema and preview types ─────────────────────────────────────────────────

export type SchemaColumn = { name: string; type: string; nullable: boolean }
export type SchemaTable  = { name: string; columns: SchemaColumn[] }

// ── Internal fetch helper ─────────────────────────────────────────────────────
// Centralises auth header injection and response unwrapping for endpoints that
// are not yet covered by the generated SDK (schema, preview, test).

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  const body = await res.json() as { code: number; msg: string; data?: T }
  if (body.code !== 0) throw new Error(body.msg || '请求失败')
  return body.data as T
}

// ── Non-SDK endpoints ────────────────────────────────────────────────────────

export const apiGetSchema = (slug: string, datasourceId: number): Promise<SchemaTable[]> =>
  apiFetch(`/v1/tenants/${slug}/datasources/${datasourceId}/schema`)

export const apiPreviewTable = (
  slug: string,
  datasourceId: number,
  table: string,
  limit = 100,
): Promise<Record<string, unknown>[]> =>
  apiFetch(`/v1/tenants/${slug}/datasources/${datasourceId}/tables/${encodeURIComponent(table)}/preview?limit=${limit}`)

export const apiTestDatasource = (
  slug: string,
  dsn: string,
  gatewayId: number,
): Promise<{ latency_ms: number }> =>
  apiFetch(`/v1/tenants/${slug}/datasources/test`, {
    method: 'POST',
    body: JSON.stringify({ dsn, gateway_id: gatewayId }),
  })
