import { create } from 'zustand'

export type ViewContext = 'SYSTEM' | 'TENANT'

interface UIState {
  viewContext: ViewContext
  activeTenant: string
  setViewContext: (context: ViewContext) => void
  setActiveTenant: (tenantId: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  viewContext: 'SYSTEM',
  activeTenant: 'sh-rd',
  setViewContext: (viewContext) => set({ viewContext }),
  setActiveTenant: (activeTenant) => set({ activeTenant }),
}))
