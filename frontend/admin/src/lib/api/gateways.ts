import { listGateways, createGateway, getGateway, deleteGateway } from '@/lib/sdk'
import type { Gateway, ListQuery, PaginatedData, CreateGatewayRequest } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListGateways = (slug: string, q: ListQuery = {}) => cast<PaginatedData<Gateway>>(listGateways({ path: { slug }, query: q }))
export const apiCreateGateway = (slug: string, req: CreateGatewayRequest) => cast<Gateway>(createGateway({ path: { slug }, body: req }))
export const apiGetGateway = (slug: string, gatewayId: number) => cast<Gateway>(getGateway({ path: { slug, gatewayId } }))
export const apiDeleteGateway = (slug: string, gatewayId: number) => cast<void>(deleteGateway({ path: { slug, gatewayId } }))
