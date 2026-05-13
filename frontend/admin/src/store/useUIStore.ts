import { create } from 'zustand'

export type ViewContext = 'SYSTEM' | 'TENANT'

interface UIStore {
  viewContext: ViewContext
  sidebarCollapsed: boolean
  setViewContext: (context: ViewContext) => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewContext: 'SYSTEM',
  sidebarCollapsed: false,
  setViewContext: (viewContext) => set({ viewContext }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}))
