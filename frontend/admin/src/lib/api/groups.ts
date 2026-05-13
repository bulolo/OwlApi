import { listGroups, createGroup, updateGroup, deleteGroup } from '@/lib/sdk'
import type { ApiGroup, ListQuery, PaginatedData, CreateGroupRequest, UpdateGroupRequest } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListGroups = (slug: string, projectId: number, q: ListQuery = {}) =>
  listGroups({ path: { slug, projectId }, query: q }) as unknown as Promise<PaginatedData<ApiGroup>>

export const apiCreateGroup = (slug: string, projectId: number, req: CreateGroupRequest) =>
  createGroup({ path: { slug, projectId }, body: req }) as unknown as Promise<ApiGroup>

export const apiUpdateGroup = (slug: string, projectId: number, groupId: number, req: UpdateGroupRequest) =>
  updateGroup({ path: { slug, projectId, groupId }, body: req }) as unknown as Promise<ApiGroup>

export const apiDeleteGroup = (slug: string, projectId: number, groupId: number) =>
  deleteGroup({ path: { slug, projectId, groupId } }) as unknown as Promise<void>
