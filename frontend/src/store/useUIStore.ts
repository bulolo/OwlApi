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
  register: (email: string, name: string, password: string, tenantName?: string, tenantDomain?: string) => Promise<AuthResponse>
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
    set({ user: res.user, token: res.token })
    return res
  },

  register: async (email, name, password, tenantName, tenantDomain) => {
    const res = await apiRegister({ email, name, password, tenant_name: tenantName, tenant_slug: tenantDomain })
    set({ user: res.user, token: res.token })
    return res
  },

  logout: () => {
    clearToken()
    set({ user: null, token: null, activeTenant: '' })
  },

  restoreSession: () => {
    const token = getToken()
    if (token) {
      set({ token })
      // TODO: call /api/v1/auth/me to restore user info
    }
  },
}))
