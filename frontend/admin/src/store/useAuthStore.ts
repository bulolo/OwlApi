import { create } from 'zustand'
import { login, register } from '@/lib/sdk'
import type { AuthResp, UserResp } from '@/lib/sdk'
import { clearToken, getToken, setToken } from '@/lib/custom-fetch'
import { STORAGE_KEYS } from '@/lib/constants'

interface AuthStore {
  user: UserResp | null
  token: string | null
  login: (email: string, password: string) => Promise<AuthResp>
  register: (email: string, name: string, password: string, tenantName?: string, tenantSlug?: string) => Promise<AuthResp>
  logout: () => void
  restoreSession: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,

  login: async (email, password) => {
    const res = await login({ email, password }) as AuthResp
    if (res.token) setToken(res.token)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user))
    set({ user: res.user, token: res.token })
    return res
  },

  register: async (email, name, password, tenantName, tenantSlug) => {
    const res = await register({ email, name, password, tenant_name: tenantName, tenant_slug: tenantSlug }) as AuthResp
    if (res.token) setToken(res.token)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user))
    set({ user: res.user, token: res.token })
    return res
  },

  logout: () => {
    clearToken()
    localStorage.removeItem(STORAGE_KEYS.USER)
    set({ user: null, token: null })
  },

  restoreSession: () => {
    const token = getToken()
    if (!token) return
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER)
      set({ token, user: raw ? JSON.parse(raw) as UserResp : null })
    } catch {
      clearToken()
      localStorage.removeItem(STORAGE_KEYS.USER)
      set({ token: null, user: null })
    }
  },
}))
