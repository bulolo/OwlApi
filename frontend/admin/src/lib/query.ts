import { testQuery, runSQL, exportOpenApi } from '@/lib/sdk'
import type { TestQueryBody, RunSQLBody, ExportOpenApiParams } from '@/lib/sdk'
import customFetch from '@/lib/custom-fetch'

export const apiRun = (slug: string, endpointId: number, envId: number, params: Record<string, string>, ignoreScripts = false) =>
  testQuery(slug, {
    endpoint_id: endpointId,
    env_id: envId,
    params,
    ignore_scripts: ignoreScripts,
  } as TestQueryBody) as Promise<Record<string, unknown>>

export const apiRunSQL = (slug: string, projectId: number, sql: string, datasourceAlias: string, envId: number, params: Record<string, string>) =>
  runSQL(slug, projectId, {
    sql,
    datasource_alias: datasourceAlias,
    env_id: envId,
    params,
  } as RunSQLBody) as Promise<Record<string, unknown>>

export const apiGetOpenAPIShareToken = (slug: string, projectId: number, env: string): Promise<{ token: string; env: string }> =>
  customFetch(`/v1/tenants/${encodeURIComponent(slug)}/projects/${projectId}/openapi-share?env=${encodeURIComponent(env)}`)

export const apiCreateOpenAPIShareToken = (slug: string, projectId: number, env: string): Promise<{ token: string; env: string }> =>
  customFetch(`/v1/tenants/${encodeURIComponent(slug)}/projects/${projectId}/openapi-share?env=${encodeURIComponent(env)}`, { method: "POST" })

export const apiRevokeOpenAPIShareToken = (slug: string, projectId: number, env: string): Promise<void> =>
  customFetch(`/v1/tenants/${encodeURIComponent(slug)}/projects/${projectId}/openapi-share?env=${encodeURIComponent(env)}`, { method: "DELETE" })

export const apiExportOpenAPI = async (slug: string, projectId: number, envName?: string): Promise<void> => {
  if (typeof window === 'undefined') return
  const spec = await exportOpenApi(slug, projectId, (envName ? { env: envName } : undefined) as ExportOpenApiParams) as Record<string, unknown>
  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `openapi${envName ? '-' + envName : ''}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
