import { listUsers, addUser, updateUserRole, removeUser } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { TenantUser, ListQuery, PaginatedData, AddUserRequest, UpdateUserRoleRequest } from './types'

export const apiListUsers = (slug: string, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<TenantUser>>(listUsers({ path: { slug }, query: q }))

export const apiAddUser = (slug: string, req: AddUserRequest) =>
  wrapResponse<void>(addUser({ path: { slug }, body: req }))

export const apiUpdateUserRole = (slug: string, userId: number, req: UpdateUserRoleRequest) =>
  wrapResponse<void>(updateUserRole({ path: { slug, userId }, body: req }))

export const apiRemoveUser = (slug: string, userId: number) =>
  wrapResponse<void>(removeUser({ path: { slug, userId } }))
