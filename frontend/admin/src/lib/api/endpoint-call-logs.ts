import { listEndpointCallLogs } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { EndpointCallLogResp } from '@/lib/sdk'
import type { ListQuery, PaginatedData } from './types'

export type EndpointCallLog = EndpointCallLogResp

export interface CallLogQuery extends ListQuery {
  status?: 'all' | '2xx' | '4xx' | '5xx' | ''
  keyword?: string
  since?: string
}

export const apiListEndpointCallLogs = (slug: string, projectId: number, endpointId: number, q: CallLogQuery = {}) =>
  wrapResponse<PaginatedData<EndpointCallLog>>(
    listEndpointCallLogs({ path: { slug, projectId, endpointId }, query: q }),
  )
