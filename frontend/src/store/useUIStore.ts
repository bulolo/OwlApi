import { create } from 'zustand'
import { apiLogin, apiRegister, clearToken, getToken, type AuthResponse } from '@/lib/api-client'
import type { User } from '@/lib/sdk'

export type ViewContext = 'SYSTEM' | 'TENANT'

interface UIState {
  viewContext: ViewContext
  activeTenant: string
  user: User | null
  token: string | null

  setViewContext: (context: ViewContext) => void
  setActiveTenant: (tenantId: string) => void
  login: (email: string, password: string) => Promise<AuthResponse>
  register: (email: string, name: string, password: string, tenantName?: string, tenantSlug?: string) => Promise<AuthResponse>
  logout: () => void
  restoreSession: () => void
}

export const useUIStore = create<UIState>((set) => ({
  viewContext: 'SYSTEM',
  activeTenant: '',
  user: null,
  token: null,

  setViewContext: (viewContext) => set({ viewContext }),
  setActiveTenant: (activeTenant) => set({ activeTenant }),

  login: async (email, password) => {
    const res = await apiLogin({ email, password })
    localStorage.setItem('owlapi_user', JSON.stringify(res.user))
    set({ user: res.user, token: res.token })
    return res
  },

  register: async (email, name, password, tenantName, tenantSlug) => {
    const res = await apiRegister({ email, name, password, tenant_name: tenantName, tenant_slug: tenantSlug })
    localStorage.setItem('owlapi_user', JSON.stringify(res.user))
    set({ user: res.user, token: res.token })
    return res
  },

  logout: () => {
    clearToken()
    localStorage.removeItem('owlapi_user')
    set({ user: null, token: null, activeTenant: '' })
  },

  restoreSession: () => {
    const token = getToken()
    if (token) {
      try {
        const user = JSON.parse(localStorage.getItem('owlapi_user') || 'null')
        set({ token, user })
      } catch {
        set({ token })
      }
    }
  },
}))
