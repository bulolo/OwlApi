import { listReleases, publishEndpoint, activateRelease, unpublishEndpoint } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { EndpointReleaseResp } from '@/lib/sdk'
import type { ListQuery, PaginatedData } from './types'

export type EndpointRelease = EndpointReleaseResp

export const apiListReleases = (slug: string, projectId: number, endpointId: number, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<EndpointRelease>>(listReleases({ path: { slug, projectId, endpointId }, query: q }))

export const apiPublishEndpoint = (slug: string, projectId: number, endpointId: number, note = '') =>
  wrapResponse<EndpointRelease>(publishEndpoint({ path: { slug, projectId, endpointId }, body: { note } }))

export const apiActivateRelease = (slug: string, projectId: number, endpointId: number, releaseId: number) =>
  wrapResponse<void>(activateRelease({ path: { slug, projectId, endpointId, releaseId } }))

export const apiUnpublishEndpoint = (slug: string, projectId: number, endpointId: number) =>
  wrapResponse<void>(unpublishEndpoint({ path: { slug, projectId, endpointId } }))
