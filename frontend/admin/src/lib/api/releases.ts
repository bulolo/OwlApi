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

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListReleases = (slug: string, projectId: number, endpointId: number, q: ListQuery = {}) =>
  cast<PaginatedData<EndpointRelease>>(listReleases({ path: { slug, projectId, endpointId }, query: q }))

export const apiPublishEndpoint = (slug: string, projectId: number, endpointId: number, note = '') =>
  cast<EndpointRelease>(publishEndpoint({ path: { slug, projectId, endpointId }, body: { note } }))

export const apiActivateRelease = (slug: string, projectId: number, endpointId: number, releaseId: number) =>
  cast<void>(activateRelease({ path: { slug, projectId, endpointId, releaseId } }))

export const apiUnpublishEndpoint = (slug: string, projectId: number, endpointId: number) =>
  cast<void>(unpublishEndpoint({ path: { slug, projectId, endpointId } }))
