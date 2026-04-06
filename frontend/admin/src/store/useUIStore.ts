import { create } from 'zustand'
import { apiLogin, apiRegister, clearToken, getToken, type AuthResponse } from '@/lib/api-client'
import type { User } from '@/lib/api-client'

export type ViewContext = 'SYSTEM' | 'TENANT'

interface UIStore {
  // UI
  viewContext: ViewContext
  activeTenant: string
  sidebarCollapsed: boolean
  setViewContext: (context: ViewContext) => void
  setActiveTenant: (tenantId: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  // Auth
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<AuthResponse>
  register: (email: string, name: string, password: string, tenantName?: string, tenantSlug?: string) => Promise<AuthResponse>
  logout: () => void
  restoreSession: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewContext: 'SYSTEM',
  activeTenant: '',
  sidebarCollapsed: false,
  user: null,
  token: null,

  setViewContext: (viewContext) => set({ viewContext }),
  setActiveTenant: (activeTenant) => set({ activeTenant }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

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
    if (!token) return
    try {
      const raw = localStorage.getItem('owlapi_user')
      set({ token, user: raw ? JSON.parse(raw) as User : null })
    } catch {
      clearToken()
      localStorage.removeItem('owlapi_user')
      set({ token: null, user: null })
    }
  },
}))
