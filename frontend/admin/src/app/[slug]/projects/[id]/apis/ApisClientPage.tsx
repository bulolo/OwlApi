"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Play, BookOpen, Code2, ScrollText, History } from "lucide-react"

import { useApiEditorStore } from "./_store/useApiEditorStore"
import { useEndpointFormStore } from "./_store/useEndpointFormStore"
import { useEndpointsQuery } from "./_hooks/useEndpointsQuery"
import { useReferenceData } from "./_hooks/useReferenceData"
import { useTenantProject } from "./_hooks/useTenantProject"
import { showConfirm } from "@/store/useConfirmStore"

import { ApiSidebar } from "./_components/ApiSidebar"
import { DesignTab } from "./_components/DesignTab"
import { DebugTab } from "./_components/DebugTab"
import { DocTab } from "./_components/DocTab"
import { ReleasesTab } from "./_components/ReleasesTab"
import { GroupModal } from "./_components/GroupModal"
import { ApiEmptyState, LogsPlaceholder } from "./_components/ApiEmptyState"
import { BasicInfoModal } from "./_components/BasicInfoModal"
import type { ActiveTab, ApiEndpoint } from "./_types"

const TABS = [
  { value: "doc" as const, icon: BookOpen, label: "文档" },
  { value: "design" as const, icon: Code2, label: "设计" },
  { value: "run" as const, icon: Play, label: "调试" },
  { value: "logs" as const, icon: ScrollText, label: "日志" },
  { value: "releases" as const, icon: History, label: "版本历史" },
]

export default function ApisPage() {
  const { activeTenant, projectId } = useTenantProject()

  // UI store
  const selectedId = useApiEditorStore(s => s.selectedId)
  const isNew = useApiEditorStore(s => s.isNew)
  const activeTab = useApiEditorStore(s => s.activeTab)
  const setSelectedId = useApiEditorStore(s => s.setSelectedId)
  const setIsNew = useApiEditorStore(s => s.setIsNew)
  const setActiveTab = useApiEditorStore(s => s.setActiveTab)

  // Form store
  const isDirty = useEndpointFormStore(s => s.isDirty)
  const initForm = useEndpointFormStore(s => s.initForm)
  const setFormField = useEndpointFormStore(s => s.setFormField)

  // Server data
  const { list: endpoints } = useEndpointsQuery(activeTenant, projectId)
  const { dataSources } = useReferenceData(activeTenant)

  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Sync form when endpoint data refreshes (e.g. after publish updates has_draft)
  useEffect(() => {
    if (selectedId && endpoints.length > 0) {
      const ep = endpoints.find(e => e.id === selectedId)
      // Only re-init if form is clean (don't overwrite user's edits)
      if (ep && !isDirty) initForm(ep, dataSources[0]?.id)
    }
  }, [endpoints]) // eslint-disable-line react-hooks/exhaustive-deps

  async function guardDirty(): Promise<boolean> {
    if (!isDirty) return true
    return showConfirm("当前有未保存的更改，确认离开？修改将丢失。", "确认离开")
  }

  async function handleSelectEndpoint(ep: ApiEndpoint) {
    if (selectedId === ep.id && !isNew) return
    if (!await guardDirty()) return
    setSelectedId(ep.id ?? null)
    setIsNew(false)
    initForm(ep, dataSources[0]?.id)
  }

  async function handleCreateNew() {
    if (!await guardDirty()) return
    setCreateModalOpen(true)
  }

  const showEditor = isNew || selectedId !== null

  return (
    <div className="flex gap-0 h-[calc(100vh-200px)] min-h-[600px] bg-white border border-zinc-100 rounded-lg shadow-sm overflow-hidden">
      <ApiSidebar onSelectEndpoint={handleSelectEndpoint} onCreateNew={handleCreateNew} />

      <div className="flex-1 min-w-0 bg-white">
        {showEditor ? (
          <div className="h-full flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={v => setActiveTab(v as ActiveTab)}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-6 border-b border-zinc-100 bg-white shrink-0">
                <TabsList className="h-11 bg-transparent p-0 gap-1">
                  {TABS.map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-400 data-[state=active]:text-blue-600 font-semibold px-3 text-xs tracking-wide transition-all"
                    >
                      <tab.icon className="w-3.5 h-3.5 mr-1.5" /> {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto bg-[#fafbfc]">
                <TabsContent value="design" className="m-0"><DesignTab /></TabsContent>
                <TabsContent value="run" className="m-0"><DebugTab /></TabsContent>
                <TabsContent value="doc" className="m-0"><DocTab /></TabsContent>
                <TabsContent value="logs" className="m-0 animate-in fade-in duration-300"><LogsPlaceholder /></TabsContent>
                <TabsContent value="releases" className="m-0"><ReleasesTab /></TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          <ApiEmptyState onCreateNew={handleCreateNew} />
        )}
      </div>

      <GroupModal />

      <BasicInfoModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="create"
        onConfirm={values => {
          setCreateModalOpen(false)
          setSelectedId(null)
          setIsNew(true)
          initForm(null, dataSources[0]?.id)
          setFormField("method", values.method)
          setFormField("path", values.path)
          setFormField("summary", values.summary)
          setFormField("groupId", values.groupId)
          setActiveTab("design")
        }}
      />
    </div>
  )
}
