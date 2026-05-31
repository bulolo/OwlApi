"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Play, BookOpen, Code2, ScrollText, History } from "lucide-react"

import { useApiEditorStore } from "./_store/useApiEditorStore"
import { useEndpointFormStore } from "./_store/useEndpointFormStore"
import { useEndpointsQuery } from "./_hooks/useEndpointsQuery"
import { useTenantProject } from "./_hooks/useTenantProject"
import { showConfirm } from "@/store/useConfirmStore"

import { ApiSidebar } from "./_components/ApiSidebar"
import { DesignTab } from "./_components/DesignTab"
import { DebugTab } from "./_components/DebugTab"
import { DocTab } from "./_components/DocTab"
import { ReleasesTab } from "./_components/ReleasesTab"
import { GroupModal } from "./_components/GroupModal"
import { ApiEmptyState } from "./_components/ApiEmptyState"
import { LogsTab } from "./_components/LogsTab"
import { BasicInfoModal } from "./_components/BasicInfoModal"
import { EndpointHeader } from "./_components/EndpointHeader"
import type { ActiveTab, ApiEndpoint } from "./_types"

const TABS = [
  { value: "doc" as const, icon: BookOpen, label: "文档" },
  { value: "design" as const, icon: Code2, label: "设计" },
  { value: "run" as const, icon: Play, label: "运行" },
  { value: "logs" as const, icon: ScrollText, label: "日志" },
  { value: "releases" as const, icon: History, label: "版本管理" },
]

export default function Apis() {
  const { activeTenant, projectId } = useTenantProject()
  const router = useRouter()
  const searchParams = useSearchParams()

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
  const save = useEndpointFormStore(s => s.save)

  // Server data
  const { list: endpoints } = useEndpointsQuery(activeTenant, projectId)

  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Read URL params once on mount (before any URL sync overwrites them)
  const [urlEndpointId] = useState<number | null>(() => {
    const v = searchParams.get("endpoint")
    return v ? Number(v) : null
  })
  const [urlTab] = useState<ActiveTab | null>(() => {
    const v = searchParams.get("tab")
    return TABS.some(t => t.value === v) ? v as ActiveTab : null
  })

  // Tracks whether we've done the initial URL→state hydration
  const urlApplied = useRef(false)

  // URL → state: apply once when endpoints first become available
  useEffect(() => {
    if (urlApplied.current || endpoints.length === 0) return
    urlApplied.current = true
    if (urlEndpointId) {
      const ep = endpoints.find(e => e.id === urlEndpointId)
      if (ep) {
        setSelectedId(ep.id)
        setIsNew(false)
        initForm(ep, "main")
      }
    }
    if (urlTab) setActiveTab(urlTab)
  }, [endpoints]) // eslint-disable-line react-hooks/exhaustive-deps

  // state → URL: keep URL in sync after hydration is done
  useEffect(() => {
    if (!urlApplied.current) return
    const p = new URLSearchParams()
    if (selectedId) p.set("endpoint", String(selectedId))
    p.set("tab", activeTab)
    router.replace(`?${p.toString()}`, { scroll: false })
  }, [selectedId, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync form when endpoint data refreshes (e.g. after publish updates has_draft).
  // Trigger is purely the endpoints refresh; selection/dirty are read fresh from the
  // stores via getState() so there's no stale-closure risk and deps stay honest.
  useEffect(() => {
    if (endpoints.length === 0) return
    const { selectedId } = useApiEditorStore.getState()
    const { isDirty, initForm } = useEndpointFormStore.getState()
    if (!selectedId) return
    const ep = endpoints.find(e => e.id === selectedId)
    // Only re-init if form is clean (don't overwrite user's edits).
    if (ep && !isDirty) initForm(ep, "main")
  }, [endpoints])

  async function guardDirty(): Promise<boolean> {
    if (!isDirty) return true
    return showConfirm("当前有未保存的更改，确认离开？修改将丢失。", "确认离开")
  }

  async function handleSelectEndpoint(ep: ApiEndpoint) {
    if (selectedId === ep.id && !isNew) return
    if (!await guardDirty()) return
    setSelectedId(ep.id ?? null)
    setIsNew(false)
    initForm(ep, "main")
  }

  async function handleCreateNew() {
    if (!await guardDirty()) return
    setCreateModalOpen(true)
  }

  const showEditor = isNew || selectedId !== null

  return (
    <div className="flex gap-0 h-[calc(100vh-200px)] min-h-[600px] bg-white border border-border-subtle rounded-lg shadow-card overflow-hidden">
      <ApiSidebar onSelectEndpoint={handleSelectEndpoint} onCreateNew={handleCreateNew} />

      <div className="flex-1 min-w-0 bg-white">
        {showEditor ? (
          <div className="h-full flex flex-col">
            <EndpointHeader />
            <Tabs
              value={activeTab}
              onValueChange={v => setActiveTab(v as ActiveTab)}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-6 border-b border-border-subtle bg-white shrink-0">
                <TabsList className="h-11 bg-transparent p-0 gap-1">
                  {TABS.map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-primary font-bold px-3 text-xs tracking-wide transition-all"
                    >
                      <tab.icon className="w-3.5 h-3.5 mr-1.5" /> {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto bg-zinc-50/60">
                <TabsContent value="design" className="m-0"><DesignTab /></TabsContent>
                <TabsContent value="run" className="m-0"><DebugTab /></TabsContent>
                <TabsContent value="doc" className="m-0"><DocTab /></TabsContent>
                <TabsContent value="logs" className="m-0 animate-in fade-in duration-300"><LogsTab /></TabsContent>
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
        onConfirm={async values => {
          setCreateModalOpen(false)
          setSelectedId(null)
          setIsNew(true)
          initForm(null, "main", values.method)
          setFormField("path", values.path)
          setFormField("summary", values.summary)
          setFormField("groupId", values.groupId)
          setActiveTab("design")
          // 立即创建接口（带模板 SQL + 所选分组），落库后再进设计器细化 SQL——
          // 这样"添加接口选了分组"会立刻生效，而不是等到 SQL 设计器保存。
          const created = await save(activeTenant, projectId, true, null)
          if (created?.id != null) {
            setSelectedId(created.id)
            setIsNew(false)
          }
        }}
      />
    </div>
  )
}
