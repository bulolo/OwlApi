import { listGateways, createGateway, getGateway, deleteGateway } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { Gateway, ListQuery, PaginatedData, CreateGatewayRequest } from './types'

export const apiListGateways = (slug: string, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<Gateway>>(listGateways({ path: { slug }, query: q }))

export const apiCreateGateway = (slug: string, req: CreateGatewayRequest) =>
  wrapResponse<Gateway>(createGateway({ path: { slug }, body: req }))

export const apiGetGateway = (slug: string, gatewayId: number) =>
  wrapResponse<Gateway>(getGateway({ path: { slug, gatewayId } }))

export const apiDeleteGateway = (slug: string, gatewayId: number) =>
  wrapResponse<void>(deleteGateway({ path: { slug, gatewayId } }))
