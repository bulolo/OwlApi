import { client } from '@/lib/sdk/client.gen'
import { STORAGE_KEYS } from '@/lib/constants'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

// Type-safe cast for hey-api SDK promises.
// The responseTransformer in hey-api.ts unwraps {code,msg,data} at runtime;
// this helper tells TypeScript the actual resolved type without spreading
// `as unknown as` across every wrapper.
export function wrapResponse<T>(promise: Promise<unknown>): Promise<T> {
  return promise as Promise<T>
}

export function setToken(token: string) {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${STORAGE_KEYS.TOKEN}=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${secure}`
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  document.cookie = `${STORAGE_KEYS.TOKEN}=; path=/; max-age=0`
}

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null
}

// Shared fetch helper for non-SDK endpoints.
// Goes through the same 401 redirect logic as the SDK client interceptor.
export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (res.status === 401) {
    clearToken()
    localStorage.removeItem(STORAGE_KEYS.USER)
    if (typeof window !== 'undefined') {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
    }
    throw new Error('未授权，请重新登录')
  }
  const body = await res.json() as { code: number; msg: string; data?: T }
  if (body.code !== 0) throw new Error(body.msg || '请求失败')
  return body.data as T
}

// Response interceptor.
//
// hey-api (0.13) with `responseStyle: 'data'` and no `throwOnError` returns
// `undefined` silently when the HTTP response is non-2xx — and React Query v5
// rejects any queryFn that resolves to undefined ("Query data cannot be
// undefined."). To prevent that, this interceptor turns every non-OK response
// into a thrown Error with the backend's `msg` field where available, so
// failures always reach React Query as proper error states.
client.interceptors.response.use(async (response) => {
  if (response.ok) return response

  if (response.status === 401) {
    clearToken()
    localStorage.removeItem(STORAGE_KEYS.USER)
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
      }
    }
    throw new Error('未授权，请重新登录')
  }

  let msg = `请求失败 (${response.status})`
  try {
    const body = await response.clone().json() as { msg?: string }
    if (body?.msg) msg = body.msg
  } catch {
    // not JSON — keep the generic status message
  }
  throw new Error(msg)
})
