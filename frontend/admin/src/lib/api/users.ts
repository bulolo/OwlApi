import { listUsers, addUser, updateUserRole, removeUser } from '@/lib/sdk'
import type { TenantUser, ListQuery, PaginatedData, AddUserRequest, UpdateUserRoleRequest } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListUsers = (slug: string, q: ListQuery = {}) => cast<PaginatedData<TenantUser>>(listUsers({ path: { slug }, query: q }))
export const apiAddUser = (slug: string, req: AddUserRequest) => cast<void>(addUser({ path: { slug }, body: req }))
export const apiUpdateUserRole = (slug: string, userId: number, req: UpdateUserRoleRequest) => cast<void>(updateUserRole({ path: { slug, userId }, body: req }))
export const apiRemoveUser = (slug: string, userId: number) => cast<void>(removeUser({ path: { slug, userId } }))
