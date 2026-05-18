import { testQuery, exportOpenApi } from '@/lib/sdk'
import { wrapResponse } from './token'

export const apiRun = (slug: string, endpointId: number, envId: number, params: Record<string, string>, ignoreScripts = false) =>
  wrapResponse<Record<string, unknown>>(testQuery({ path: { slug }, body: { endpoint_id: endpointId, env_id: envId, params, ignore_scripts: ignoreScripts } }))

export const apiExportOpenAPI = async (slug: string, projectId: number, envName?: string): Promise<void> => {
  if (typeof window === 'undefined') return
  const spec = await wrapResponse<Record<string, unknown>>(exportOpenApi({ path: { slug, projectId }, query: envName ? { env: envName } : undefined }))
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
