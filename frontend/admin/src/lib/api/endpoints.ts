import { listEndpoints, createEndpoint, deleteEndpoint, updateEndpoint } from '@/lib/sdk'
import type { ApiEndpoint, ListQuery, PaginatedData, CreateEndpointRequest, UpdateEndpointRequest } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListEndpoints = (slug: string, projectId: number, q: ListQuery = {}) =>
  listEndpoints({ path: { slug, projectId }, query: q }) as unknown as Promise<PaginatedData<ApiEndpoint>>

export const apiCreateEndpoint = (slug: string, projectId: number, req: CreateEndpointRequest) =>
  createEndpoint({ path: { slug, projectId }, body: req }) as unknown as Promise<ApiEndpoint>

export const apiUpdateEndpoint = (slug: string, projectId: number, endpointId: number, req: UpdateEndpointRequest) =>
  updateEndpoint({ path: { slug, projectId, endpointId }, body: req }) as unknown as Promise<ApiEndpoint>

export const apiDeleteEndpoint = (slug: string, projectId: number, endpointId: number) =>
  deleteEndpoint({ path: { slug, projectId, endpointId } }) as unknown as Promise<void>
