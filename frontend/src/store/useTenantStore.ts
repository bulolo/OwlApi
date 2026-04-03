import { create } from 'zustand'
import { apiListTenants, apiCreateTenant, type Tenant } from '@/lib/api-client'

interface TenantState {
  tenants: Tenant[]
  loading: boolean
  recentTenants: string[]

  fetchTenants: () => Promise<void>
  addTenant: (name: string, slug: string, plan: string, userId: string) => Promise<Tenant>
  markTenantAsRecent: (id: string) => void
}

export const useTenantStore = create<TenantState>((set) => ({
  tenants: [],
  loading: false,
  recentTenants: [],

  fetchTenants: async () => {
    set({ loading: true })
    try {
      const tenants = await apiListTenants()
      set({ tenants })
    } catch {
      // fallback: keep current state
    } finally {
      set({ loading: false })
    }
  },

  addTenant: async (name, slug, plan, userId) => {
    const tenant = await apiCreateTenant({ name, slug, plan: plan as any, user_id: userId })
    set((state) => ({ tenants: [...state.tenants, tenant] }))
    return tenant
  },

  markTenantAsRecent: (id) => set((state) => {
    const nextRecent = [id, ...state.recentTenants.filter(rid => rid !== id)].slice(0, 5)
    return { recentTenants: nextRecent }
  }),
}))

export type { Tenant }
