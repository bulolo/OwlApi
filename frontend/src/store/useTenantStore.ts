import { create } from 'zustand'

export type TenantPlan = 'Free' | 'Pro' | 'Enterprise'
export type TenantStatus = 'Active' | 'Warning' | 'Suspended'

export interface Tenant {
  id: string
  name: string
  domain: string
  plan: TenantPlan
  status: TenantStatus
  users: number
  apis: number
  engineers: number
  createdAt: string
}

interface TenantState {
  tenants: Tenant[]
  recentTenants: string[] // IDs of recently accessed tenants

  // Actions
  addTenant: (tenant: Omit<Tenant, 'id' | 'createdAt'>) => void
  updateTenant: (id: string, updates: Partial<Tenant>) => void
  markTenantAsRecent: (id: string) => void
}

export const useTenantStore = create<TenantState>((set) => ({
  tenants: [
    {
      id: "T-8921",
      name: "上海研发中心",
      domain: "sh-rd",
      plan: "Pro",
      status: "Active",
      users: 24,
      apis: 156,
      engineers: 8,
      createdAt: "2024-01-10"
    },
    {
      id: "T-4432",
      name: "蚂蚁金服集群",
      domain: "ant-fin",
      plan: "Enterprise",
      status: "Active",
      users: 150,
      apis: 1240,
      engineers: 42,
      createdAt: "2023-11-20"
    },
    {
      id: "T-2210",
      name: "默认测试租户",
      domain: "default",
      plan: "Free",
      status: "Warning",
      users: 3,
      apis: 12,
      engineers: 1,
      createdAt: "2024-01-20"
    }
  ],
  recentTenants: ["T-8921", "T-4432"],

  addTenant: (tenant) => set((state) => ({
    tenants: [...state.tenants, {
      ...tenant,
      id: `T-${Math.floor(Math.random() * 9000) + 1000}`,
      createdAt: new Date().toISOString().split('T')[0]
    }]
  })),

  updateTenant: (id, updates) => set((state) => ({
    tenants: state.tenants.map(t => t.id === id ? { ...t, ...updates } : t)
  })),

  markTenantAsRecent: (id) => set((state) => {
    const nextRecent = [id, ...state.recentTenants.filter(rid => rid !== id)].slice(0, 5)
    return { recentTenants: nextRecent }
  })
}))
