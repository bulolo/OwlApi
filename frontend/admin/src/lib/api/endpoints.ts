import { listEndpoints, createEndpoint, deleteEndpoint, updateEndpoint } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { ApiEndpoint, ListQuery, PaginatedData, CreateEndpointRequest, UpdateEndpointRequest } from './types'

export const apiListEndpoints = (slug: string, projectId: number, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<ApiEndpoint>>(listEndpoints({ path: { slug, projectId }, query: q }))

export const apiCreateEndpoint = (slug: string, projectId: number, req: CreateEndpointRequest) =>
  wrapResponse<ApiEndpoint>(createEndpoint({ path: { slug, projectId }, body: req }))

export const apiUpdateEndpoint = (slug: string, projectId: number, endpointId: number, req: UpdateEndpointRequest) =>
  wrapResponse<ApiEndpoint>(updateEndpoint({ path: { slug, projectId, endpointId }, body: req }))

export const apiDeleteEndpoint = (slug: string, projectId: number, endpointId: number) =>
  wrapResponse<void>(deleteEndpoint({ path: { slug, projectId, endpointId } }))
