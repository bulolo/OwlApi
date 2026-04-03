import { create } from 'zustand'
import { apiListTenants, apiCreateTenant, type Tenant } from '@/lib/api-client'

interface TenantState {
  tenants: Tenant[]
  loading: boolean
  page: number
  size: number
  total: number
  recentTenants: string[]

  fetchTenants: (page?: number, size?: number) => Promise<void>
  addTenant: (name: string, slug: string, plan: string) => Promise<Tenant>
  markTenantAsRecent: (id: string) => void
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenants: [],
  loading: false,
  page: 1,
  size: 10,
  total: 0,
  recentTenants: [],

  fetchTenants: async (page?: number, size?: number) => {
    const p = page ?? get().page
    const s = size ?? get().size
    set({ loading: true })
    try {
      const res = await apiListTenants(p, s)
      set({ tenants: res.list || [], page: res.pagination.page, size: res.pagination.size, total: res.pagination.total })
    } catch {
      // keep current state
    } finally {
      set({ loading: false })
    }
  },

  addTenant: async (name, slug, plan) => {
    const tenant = await apiCreateTenant({ name, slug, plan: plan as any })
    // Refresh list
    get().fetchTenants()
    return tenant
  },

  markTenantAsRecent: (id) => set((state) => {
    const nextRecent = [id, ...state.recentTenants.filter(rid => rid !== id)].slice(0, 5)
    return { recentTenants: nextRecent }
  }),
}))

export type { Tenant }
