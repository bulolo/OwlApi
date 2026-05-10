import { listGroups, createGroup, updateGroup, deleteGroup } from '@/lib/sdk'
import type { ApiGroup, ListQuery, PaginatedData, CreateGroupRequest, UpdateGroupRequest } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListGroups = (slug: string, projectId: number, q: ListQuery = {}) => cast<PaginatedData<ApiGroup>>(listGroups({ path: { slug, projectId }, query: q }))
export const apiCreateGroup = (slug: string, projectId: number, req: CreateGroupRequest) => cast<ApiGroup>(createGroup({ path: { slug, projectId }, body: req }))
export const apiUpdateGroup = (slug: string, projectId: number, groupId: number, req: UpdateGroupRequest) => cast<ApiGroup>(updateGroup({ path: { slug, projectId, groupId }, body: req }))
export const apiDeleteGroup = (slug: string, projectId: number, groupId: number) => cast<void>(deleteGroup({ path: { slug, projectId, groupId } }))
