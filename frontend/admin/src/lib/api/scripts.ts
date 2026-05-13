import { listScripts, createScript, updateScript, deleteScript } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { Script, ListQuery, PaginatedData, CreateScriptRequest, UpdateScriptRequest } from './types'

export const apiListScripts = (slug: string, q: ListQuery = {}) =>
  wrapResponse<PaginatedData<Script>>(listScripts({ path: { slug }, query: q }))

export const apiCreateScript = (slug: string, req: CreateScriptRequest) =>
  wrapResponse<Script>(createScript({ path: { slug }, body: req }))

export const apiUpdateScript = (slug: string, scriptId: number, req: UpdateScriptRequest) =>
  wrapResponse<Script>(updateScript({ path: { slug, scriptId }, body: req }))

export const apiDeleteScript = (slug: string, scriptId: number) =>
  wrapResponse<void>(deleteScript({ path: { slug, scriptId } }))
