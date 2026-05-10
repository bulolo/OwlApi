import { listEndpoints, createEndpoint, deleteEndpoint, updateEndpoint } from '@/lib/sdk'
import type { ApiEndpoint, ListQuery, PaginatedData, CreateEndpointRequest, UpdateEndpointRequest } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListEndpoints = (slug: string, projectId: number, q: ListQuery = {}) => cast<PaginatedData<ApiEndpoint>>(listEndpoints({ path: { slug, projectId }, query: q }))
export const apiCreateEndpoint = (slug: string, projectId: number, req: CreateEndpointRequest) => cast<ApiEndpoint>(createEndpoint({ path: { slug, projectId }, body: req }))
export const apiUpdateEndpoint = (slug: string, projectId: number, endpointId: number, req: UpdateEndpointRequest) => cast<ApiEndpoint>(updateEndpoint({ path: { slug, projectId, endpointId }, body: req }))
export const apiDeleteEndpoint = (slug: string, projectId: number, endpointId: number) => cast<void>(deleteEndpoint({ path: { slug, projectId, endpointId } }))
