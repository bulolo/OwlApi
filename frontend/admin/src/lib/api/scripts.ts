import { listScripts, createScript, updateScript, deleteScript } from '@/lib/sdk'
import type { Script, ListQuery, PaginatedData, CreateScriptRequest, UpdateScriptRequest } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiListScripts = (slug: string, q: ListQuery = {}) =>
  listScripts({ path: { slug }, query: q }) as unknown as Promise<PaginatedData<Script>>

export const apiCreateScript = (slug: string, req: CreateScriptRequest) =>
  createScript({ path: { slug }, body: req }) as unknown as Promise<Script>

export const apiUpdateScript = (slug: string, scriptId: number, req: UpdateScriptRequest) =>
  updateScript({ path: { slug, scriptId }, body: req }) as unknown as Promise<Script>

export const apiDeleteScript = (slug: string, scriptId: number) =>
  deleteScript({ path: { slug, scriptId } }) as unknown as Promise<void>
