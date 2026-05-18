import {
  listEndpointVersions,
  listEndpointActives,
  createEndpointVersion,
  activateEndpointVersion,
  publishEndpoint,
  unpublishEndpoint,
  promoteEndpointVersion,
  listEndpointActivationLog,
  deleteEndpointVersion,
  revertEndpointToActive,
} from '@/lib/sdk'
import { wrapResponse } from './token'
import type { EndpointVersionResp, EndpointActivationLogResp } from '@/lib/sdk'
import type { ListQuery, PaginatedData, PromoteRequest } from './types'

export type EndpointVersion = EndpointVersionResp
export type EndpointActivationLog = EndpointActivationLogResp

// One per-env active pointer for an endpoint.
export type EndpointActiveVersion = {
  tenant_id: number
  endpoint_id: number
  env_id: number
  version_id: number
  version: number
  activated_by: number
  activated_at: string
}

export const apiListEndpointVersions = (slug: string, projectId: number, endpointId: number, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<EndpointVersion>>(listEndpointVersions({ path: { slug, projectId, endpointId }, query: q }))

export const apiListEndpointActives = (slug: string, projectId: number, endpointId: number) =>
  wrapResponse<EndpointActiveVersion[]>(listEndpointActives({ path: { slug, projectId, endpointId } }))

export const apiCreateEndpointVersion = (slug: string, projectId: number, endpointId: number, note = '') =>
  wrapResponse<EndpointVersion>(createEndpointVersion({ path: { slug, projectId, endpointId }, body: { note } }))

export const apiPublishEndpoint = (slug: string, projectId: number, endpointId: number, envId: number, note = '') =>
  wrapResponse<EndpointVersion>(publishEndpoint({ path: { slug, projectId, endpointId }, query: { env_id: envId }, body: { note } }))

export const apiActivateEndpointVersion = (slug: string, projectId: number, endpointId: number, versionId: number, envId: number) =>
  wrapResponse<void>(activateEndpointVersion({ path: { slug, projectId, endpointId, versionId }, query: { env_id: envId } }))

export const apiUnpublishEndpoint = (slug: string, projectId: number, endpointId: number, envId: number) =>
  wrapResponse<void>(unpublishEndpoint({ path: { slug, projectId, endpointId }, query: { env_id: envId } }))

export const apiPromoteEndpoint = (slug: string, projectId: number, endpointId: number, req: PromoteRequest) =>
  wrapResponse<void>(promoteEndpointVersion({ path: { slug, projectId, endpointId }, body: req }))

export const apiListEndpointActivationLog = (slug: string, projectId: number, endpointId: number, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<EndpointActivationLog>>(listEndpointActivationLog({ path: { slug, projectId, endpointId }, query: q }))

export const apiDeleteEndpointVersion = (slug: string, projectId: number, endpointId: number, versionId: number) =>
  wrapResponse<void>(deleteEndpointVersion({ path: { slug, projectId, endpointId, versionId } }))

export const apiRevertEndpointToActive = (slug: string, projectId: number, endpointId: number, envId: number) =>
  wrapResponse<void>(revertEndpointToActive({ path: { slug, projectId, endpointId }, query: { env_id: envId } }))
