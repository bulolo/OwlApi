import { create } from 'zustand'
import { apiLogin, apiRegister, clearToken, getToken, type AuthResponse } from '@/lib/api-client'
import type { User } from '@/lib/api-client'
import { STORAGE_KEYS } from '@/lib/constants'

interface AuthStore {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<AuthResponse>
  register: (email: string, name: string, password: string, tenantName?: string, tenantSlug?: string) => Promise<AuthResponse>
  logout: () => void
  restoreSession: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,

  login: async (email, password) => {
    const res = await apiLogin({ email, password })
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user))
    set({ user: res.user, token: res.token })
    return res
  },

  register: async (email, name, password, tenantName, tenantSlug) => {
    const res = await apiRegister({ email, name, password, tenant_name: tenantName, tenant_slug: tenantSlug })
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
      set({ token, user: raw ? JSON.parse(raw) as User : null })
    } catch {
      clearToken()
      localStorage.removeItem(STORAGE_KEYS.USER)
      set({ token: null, user: null })
    }
  },
}))
