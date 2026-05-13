import { listUsers, addUser, updateUserRole, removeUser } from '@/lib/sdk'
import type { TenantUser, ListQuery, PaginatedData, AddUserRequest, UpdateUserRoleRequest } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListUsers = (slug: string, q: ListQuery = {}) =>
  listUsers({ path: { slug }, query: q }) as unknown as Promise<PaginatedData<TenantUser>>

export const apiAddUser = (slug: string, req: AddUserRequest) =>
  addUser({ path: { slug }, body: req }) as unknown as Promise<void>

export const apiUpdateUserRole = (slug: string, userId: number, req: UpdateUserRoleRequest) =>
  updateUserRole({ path: { slug, userId }, body: req }) as unknown as Promise<void>

export const apiRemoveUser = (slug: string, userId: number) =>
  removeUser({ path: { slug, userId } }) as unknown as Promise<void>
