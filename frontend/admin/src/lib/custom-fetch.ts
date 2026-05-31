/**
 * orval mutator — admin 端统一 fetch client。
 *
 * 负责：
 * 1. 注入 baseURL（NEXT_PUBLIC_API_URL）
 * 2. 注入 Authorization Bearer token
 * 3. 401 → 清登录态 + 跳 /login
 * 4. 解包 OwlApi R envelope: { code, msg, data } → 仅返回 data
 * 5. code !== 0 时抛 ApiError（消息优先用后端 msg）
 */

import { STORAGE_KEYS } from './constants'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${STORAGE_KEYS.TOKEN}=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${secure}`
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  document.cookie = `${STORAGE_KEYS.TOKEN}=; path=/; max-age=0`
}

function handleUnauthorized(): void {
  clearToken()
  localStorage.removeItem(STORAGE_KEYS.USER)
  if (typeof window === 'undefined') return
  const currentPath = window.location.pathname
  if (currentPath !== '/login') {
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
  }
}

/**
 * orval mutator 主体。
 *
 * @param url  生成器传入的相对 URL（含 query string，如 /v1/tenants/demo/datasources?page=1）
 * @param init 生成器传入的 method / body / signal / headers
 * @returns    已经解包过的业务数据（直接是后端 R envelope 的 data 字段）
 */
export async function customFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers = new Headers(init?.headers)

  if (token) headers.set('Authorization', `Bearer ${token}`)

  // 仅在有 body 且未显式设置 Content-Type 时自动注入 application/json
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE_URL}${url}`, { ...init, headers })

  // 解析 body：204/205/304 没 body；其他按 JSON 解（失败回退 text）
  let body: unknown = null
  if (![204, 205, 304].includes(res.status)) {
    const text = await res.text()
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }
  }

  // HTTP 错误（4xx / 5xx）
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    const msg =
      (body &&
      typeof body === 'object' &&
      'msg' in body &&
      typeof (body as { msg: unknown }).msg === 'string'
        ? (body as { msg: string }).msg
        : typeof body === 'string'
          ? body
          : null) ||
      res.statusText ||
      '请求失败'
    throw new ApiError(res.status, msg)
  }

  // OwlApi R envelope 解包：{ code, msg, data }
  if (
    body &&
    typeof body === 'object' &&
    'code' in body &&
    typeof (body as { code: unknown }).code === 'number'
  ) {
    const envelope = body as { code: number; msg?: string; data?: unknown }
    if (envelope.code === 0) {
      return envelope.data as T
    }
    throw new ApiError(res.status, envelope.msg || '操作失败')
  }

  // 非 envelope 形态（如 /health 直接返字符串）：原样返回
  return body as T
}

export default customFetch
