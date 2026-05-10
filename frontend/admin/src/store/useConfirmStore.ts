import { create } from 'zustand'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  _resolve: ((confirmed: boolean) => void) | null
  confirm: (message: string, title?: string) => Promise<boolean>
  accept: () => void
  reject: () => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: '确认操作',
  message: '',
  _resolve: null,

  confirm: (message, title = '确认操作') => new Promise((resolve) => {
    set({ open: true, message, title, _resolve: resolve })
  }),

  accept: () => {
    get()._resolve?.(true)
    set({ open: false, _resolve: null })
  },

  reject: () => {
    get()._resolve?.(false)
    set({ open: false, _resolve: null })
  },
}))

/** Imperative confirm — can be called outside React components */
export const showConfirm = (message: string, title?: string) =>
  useConfirmStore.getState().confirm(message, title)
