import { listScripts, createScript, updateScript, deleteScript } from '@/lib/sdk'
import type { Script, ListQuery, PaginatedData, CreateScriptRequest, UpdateScriptRequest } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiListScripts = (slug: string, q: ListQuery = {}) => cast<PaginatedData<Script>>(listScripts({ path: { slug }, query: q }))
export const apiCreateScript = (slug: string, req: CreateScriptRequest) => cast<Script>(createScript({ path: { slug }, body: req }))
export const apiUpdateScript = (slug: string, scriptId: number, req: UpdateScriptRequest) => cast<Script>(updateScript({ path: { slug, scriptId }, body: req }))
export const apiDeleteScript = (slug: string, scriptId: number) => cast<void>(deleteScript({ path: { slug, scriptId } }))
