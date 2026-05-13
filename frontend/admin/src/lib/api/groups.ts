import { listGroups, createGroup, updateGroup, deleteGroup } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { ApiGroup, ListQuery, PaginatedData, CreateGroupRequest, UpdateGroupRequest } from './types'

export const apiListGroups = (slug: string, projectId: number, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<ApiGroup>>(listGroups({ path: { slug, projectId }, query: q }))

export const apiCreateGroup = (slug: string, projectId: number, req: CreateGroupRequest) =>
  wrapResponse<ApiGroup>(createGroup({ path: { slug, projectId }, body: req }))

export const apiUpdateGroup = (slug: string, projectId: number, groupId: number, req: UpdateGroupRequest) =>
  wrapResponse<ApiGroup>(updateGroup({ path: { slug, projectId, groupId }, body: req }))

export const apiDeleteGroup = (slug: string, projectId: number, groupId: number) =>
  wrapResponse<void>(deleteGroup({ path: { slug, projectId, groupId } }))
