import { testQuery, exportOpenApi } from '@/lib/sdk'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiRun = (slug: string, endpointId: number, params: Record<string, string>, ignoreScripts = false) =>
  testQuery({ path: { slug }, body: { endpoint_id: endpointId, params, ignore_scripts: ignoreScripts } }) as unknown as Promise<Record<string, unknown>>

export const apiExportOpenAPI = async (slug: string, projectId: number): Promise<void> => {
  if (typeof window === 'undefined') return
  const spec = await (exportOpenApi({ path: { slug, projectId } }) as unknown as Promise<Record<string, unknown>>)
  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'openapi.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
