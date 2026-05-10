"use client"

import { useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Play, BookOpen, Code2, ScrollText, Settings2 } from "lucide-react"

import { useEndpointStore } from "./_store/useEndpointStore"
import { useTenantProject } from "./_hooks/useTenantProject"

import { ApiSidebar } from "./_components/ApiSidebar"
import { DesignTab } from "./_components/DesignTab"
import { DebugTab } from "./_components/DebugTab"
import { DocTab } from "./_components/DocTab"
import { SettingsTab } from "./_components/SettingsTab"
import { GroupModal } from "./_components/GroupModal"
import { EndpointHeader } from "./_components/EndpointHeader"
import { ApiEmptyState, LogsPlaceholder } from "./_components/ApiEmptyState"
import type { ActiveTab } from "./_types"

const TABS = [
  { value: "design" as const, icon: Code2, label: "设计" },
  { value: "run" as const, icon: Play, label: "调试" },
  { value: "doc" as const, icon: BookOpen, label: "文档" },
  { value: "settings" as const, icon: Settings2, label: "设置" },
  { value: "logs" as const, icon: ScrollText, label: "日志" },
]

export default function ApisPage() {
  const { activeTenant, projectId } = useTenantProject()

  const fetchAll = useEndpointStore(s => s.fetchAll)
  const isNew = useEndpointStore(s => s.isNew)
  const selectedId = useEndpointStore(s => s.selectedId)
  const activeTab = useEndpointStore(s => s.activeTab)
  const setActiveTab = useEndpointStore(s => s.setActiveTab)
  const saving = useEndpointStore(s => s.saving)
  const save = useEndpointStore(s => s.save)
  const createNew = useEndpointStore(s => s.createNew)
  const endpoints = useEndpointStore(s => s.endpoints)
  const selectEndpoint = useEndpointStore(s => s.selectEndpoint)

  const formMethod = useEndpointStore(s => s.form.method)
  const formPath = useEndpointStore(s => s.form.path)
  const groupId = useEndpointStore(s => s.form.groupId)
  const datasourceId = useEndpointStore(s => s.form.datasourceId)
  const setFormField = useEndpointStore(s => s.setFormField)
  const groups = useEndpointStore(s => s.groups)
  const dataSources = useEndpointStore(s => s.dataSources)

  const isEditing = isNew || selectedId !== null

  useEffect(() => {
    if (activeTenant && projectId) {
      fetchAll(activeTenant, projectId)
    }
  }, [activeTenant, projectId, fetchAll])

  return (
    <div className="flex gap-0 h-[calc(100vh-200px)] min-h-[600px] bg-white border border-zinc-100 rounded-lg shadow-sm overflow-hidden">
      <ApiSidebar />

      <div className="flex-1 min-w-0 bg-white">
        {isEditing ? (
          <div className="h-full flex flex-col">
            <EndpointHeader
              formMethod={formMethod}
              formPath={formPath}
              groupId={groupId}
              datasourceId={datasourceId}
              groups={groups}
              dataSources={dataSources}
              saving={saving}
              isNew={isNew}
              onMethodChange={(m) => setFormField("method", m)}
              onPathChange={(p) => setFormField("path", p)}
              onGroupChange={(id) => setFormField("groupId", id)}
              onDatasourceChange={(id) => setFormField("datasourceId", id)}
              onReset={() => selectedId ? selectEndpoint(endpoints.find(e => e.id === selectedId)!) : createNew()}
              onSave={() => save(activeTenant, projectId)}
            />

            <Tabs
              defaultValue="design"
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as ActiveTab)}
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
                <TabsContent value="settings" className="m-0"><SettingsTab /></TabsContent>
                <TabsContent value="logs" className="m-0 animate-in fade-in duration-300"><LogsPlaceholder /></TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          <ApiEmptyState onCreateNew={createNew} />
        )}
      </div>

      <GroupModal />
    </div>
  )
}
