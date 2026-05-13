import { listReleases, publishEndpoint, activateRelease, unpublishEndpoint } from '@/lib/sdk'
import type { EndpointReleaseResp, EndpointReleaseListResp } from '@/lib/sdk'
import type { ListQuery, PaginatedData } from './types'

export type EndpointRelease = {
  id: number
  tenant_id: number
  endpoint_id: number
  version: number
  note: string
  snapshot?: import('@/lib/sdk').ApiEndpoint
  published_by: number
  published_at: string
  is_active: boolean
  is_draft?: boolean
}

export type { EndpointReleaseResp, EndpointReleaseListResp }

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListReleases = (slug: string, projectId: number, endpointId: number, q: ListQuery = {}) =>
  listReleases({ path: { slug, projectId, endpointId }, query: q }) as unknown as Promise<PaginatedData<EndpointRelease>>

export const apiPublishEndpoint = (slug: string, projectId: number, endpointId: number, note = '') =>
  publishEndpoint({ path: { slug, projectId, endpointId }, body: { note } }) as unknown as Promise<EndpointRelease>

export const apiActivateRelease = (slug: string, projectId: number, endpointId: number, releaseId: number) =>
  activateRelease({ path: { slug, projectId, endpointId, releaseId } }) as unknown as Promise<void>

export const apiUnpublishEndpoint = (slug: string, projectId: number, endpointId: number) =>
  unpublishEndpoint({ path: { slug, projectId, endpointId } }) as unknown as Promise<void>
