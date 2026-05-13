import { listGateways, createGateway, getGateway, deleteGateway } from '@/lib/sdk'
import type { Gateway, ListQuery, PaginatedData, CreateGatewayRequest } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListGateways = (slug: string, q: ListQuery = {}) =>
  listGateways({ path: { slug }, query: q }) as unknown as Promise<PaginatedData<Gateway>>

export const apiCreateGateway = (slug: string, req: CreateGatewayRequest) =>
  createGateway({ path: { slug }, body: req }) as unknown as Promise<Gateway>

export const apiGetGateway = (slug: string, gatewayId: number) =>
  getGateway({ path: { slug, gatewayId } }) as unknown as Promise<Gateway>

export const apiDeleteGateway = (slug: string, gatewayId: number) =>
  deleteGateway({ path: { slug, gatewayId } }) as unknown as Promise<void>
