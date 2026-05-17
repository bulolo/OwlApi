import {
  listEndpointVersions,
  createEndpointVersion,
  activateEndpointVersion,
  publishEndpoint,
  unpublishEndpoint,
  listEndpointActivationLog,
  deleteEndpointVersion,
  revertEndpointToActive,
} from '@/lib/sdk'
import { wrapResponse } from './token'
import type { EndpointVersionResp, EndpointActivationLogResp } from '@/lib/sdk'
import type { ListQuery, PaginatedData } from './types'

export type EndpointVersion = EndpointVersionResp
export type EndpointActivationLog = EndpointActivationLogResp

export const apiListEndpointVersions = (slug: string, projectId: number, endpointId: number, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<EndpointVersion>>(listEndpointVersions({ path: { slug, projectId, endpointId }, query: q }))

export const apiCreateEndpointVersion = (slug: string, projectId: number, endpointId: number, note = '') =>
  wrapResponse<EndpointVersion>(createEndpointVersion({ path: { slug, projectId, endpointId }, body: { note } }))

export const apiPublishEndpoint = (slug: string, projectId: number, endpointId: number, note = '') =>
  wrapResponse<EndpointVersion>(publishEndpoint({ path: { slug, projectId, endpointId }, body: { note } }))

export const apiActivateEndpointVersion = (slug: string, projectId: number, endpointId: number, versionId: number) =>
  wrapResponse<void>(activateEndpointVersion({ path: { slug, projectId, endpointId, versionId } }))

export const apiUnpublishEndpoint = (slug: string, projectId: number, endpointId: number) =>
  wrapResponse<void>(unpublishEndpoint({ path: { slug, projectId, endpointId } }))

export const apiListEndpointActivationLog = (slug: string, projectId: number, endpointId: number, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<EndpointActivationLog>>(listEndpointActivationLog({ path: { slug, projectId, endpointId }, query: q }))

export const apiDeleteEndpointVersion = (slug: string, projectId: number, endpointId: number, versionId: number) =>
  wrapResponse<void>(deleteEndpointVersion({ path: { slug, projectId, endpointId, versionId } }))

export const apiRevertEndpointToActive = (slug: string, projectId: number, endpointId: number) =>
  wrapResponse<void>(revertEndpointToActive({ path: { slug, projectId, endpointId } }))
