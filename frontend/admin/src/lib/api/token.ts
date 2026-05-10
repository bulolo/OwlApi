import { client } from '@/lib/sdk/client.gen'
import { STORAGE_KEYS } from '@/lib/constants'

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

// 401 interceptor — redirect to login on auth failure
client.interceptors.response.use((response) => {
  if (response.status === 401) {
    clearToken()
    localStorage.removeItem(STORAGE_KEYS.USER)
    if (typeof window !== 'undefined') {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
    }
  }
  return response
})
