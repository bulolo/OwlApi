import { create } from 'zustand'

export type ViewContext = 'SYSTEM' | 'TENANT'

interface UIStore {
  viewContext: ViewContext
  activeTenant: string
  sidebarCollapsed: boolean
  setViewContext: (context: ViewContext) => void
  setActiveTenant: (tenantId: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewContext: 'SYSTEM',
  activeTenant: '',
  sidebarCollapsed: false,
  setViewContext: (viewContext) => set({ viewContext }),
  setActiveTenant: (activeTenant) => set({ activeTenant }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}))
