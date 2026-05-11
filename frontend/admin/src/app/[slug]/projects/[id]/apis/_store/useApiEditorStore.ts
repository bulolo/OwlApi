"use client"

import { create } from "zustand"
import type { ActiveTab, GroupModalState } from "../_types"

interface ApiEditorState {
  selectedId: number | null
  isNew: boolean
  activeTab: ActiveTab
  sidebarOpen: boolean
  searchTerm: string
  expandedGroups: number[]
  groupModal: GroupModalState
}

interface ApiEditorActions {
  setSelectedId: (id: number | null) => void
  setIsNew: (v: boolean) => void
  setActiveTab: (tab: ActiveTab) => void
  setSidebarOpen: (open: boolean) => void
  setSearchTerm: (term: string) => void
  toggleGroup: (gid: number) => void
  openGroupModal: (mode: "create" | "edit", group?: { id?: number; name?: string }) => void
  closeGroupModal: () => void
  setGroupModalName: (name: string) => void
}

export type ApiEditorStore = ApiEditorState & ApiEditorActions

const initialGroupModal: GroupModalState = {
  open: false,
  mode: "create",
  name: "",
  editingGroupId: null,
}

export const useApiEditorStore = create<ApiEditorStore>((set) => ({
  selectedId: null,
  isNew: false,
  activeTab: "doc",
  sidebarOpen: true,
  searchTerm: "",
  expandedGroups: [0],
  groupModal: { ...initialGroupModal },

  setSelectedId: (id) => set({ selectedId: id }),
  setIsNew: (v) => set({ isNew: v }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleGroup: (gid) =>
    set((s) => ({
      expandedGroups: s.expandedGroups.includes(gid)
        ? s.expandedGroups.filter((id) => id !== gid)
        : [...s.expandedGroups, gid],
    })),
  openGroupModal: (mode, group) =>
    set({
      groupModal: {
        open: true,
        mode,
        name: group?.name ?? "",
        editingGroupId: group?.id ?? null,
      },
    }),
  closeGroupModal: () => set({ groupModal: { ...initialGroupModal } }),
  setGroupModalName: (name) => set((s) => ({ groupModal: { ...s.groupModal, name } })),
}))
