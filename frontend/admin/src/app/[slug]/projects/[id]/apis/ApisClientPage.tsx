"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Play, Save, Plus, Terminal, Database, BookOpen, Code2, ScrollText, Settings2, Folder } from "lucide-react"
import { cn } from "@/lib/utils"

import { useEndpointStore } from "./_store/useEndpointStore"
import { useTenantProject } from "./_hooks/useTenantProject"

import { ApiSidebar } from "./_components/ApiSidebar"
import { DesignTab } from "./_components/DesignTab"
import { DebugTab } from "./_components/DebugTab"
import { DocTab } from "./_components/DocTab"
import { SettingsTab } from "./_components/SettingsTab"
import { GroupModal } from "./_components/GroupModal"
import type { ActiveTab, HttpMethod } from "./_types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ── Tab 定义 ──
const TABS = [
  { value: "design" as const, icon: Code2, label: "设计" },
  { value: "run" as const, icon: Play, label: "调试" },
  { value: "doc" as const, icon: BookOpen, label: "文档" },
  { value: "settings" as const, icon: Settings2, label: "设置" },
  { value: "logs" as const, icon: ScrollText, label: "日志" },
]

export default function ApisPage({ projectId: _propProjectId }: { projectId: string }) {
  const { activeTenant, projectId } = useTenantProject()

  // 从 store 获取状态
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

  // 表单状态
  const formMethod = useEndpointStore(s => s.form.method)
  const formPath = useEndpointStore(s => s.form.path)
  const groupId = useEndpointStore(s => s.form.groupId)
  const datasourceId = useEndpointStore(s => s.form.datasourceId)
  const setFormField = useEndpointStore(s => s.setFormField)
  const groups = useEndpointStore(s => s.groups)
  const dataSources = useEndpointStore(s => s.dataSources)

  const isEditing = isNew || selectedId !== null

  // 初始化加载
  useEffect(() => {
    if (activeTenant && projectId) {
      fetchAll(activeTenant, projectId)
    }
  }, [activeTenant, projectId, fetchAll])

  return (
    <div className="flex gap-0 h-[calc(100vh-200px)] min-h-[600px] bg-white border border-zinc-100 rounded-lg shadow-sm overflow-hidden">
      {/* Sidebar */}
      <ApiSidebar />

      {/* Editor workspace */}
      <div className="flex-1 min-w-0 bg-white">
        {isEditing ? (
          <div className="h-full flex flex-col">
            {/* Header */}
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

            {/* Tabs */}
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
                      className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-400 data-[state=active]:text-blue-600 font-semibold px-3 text-[12px] tracking-wide transition-all"
                    >
                      <tab.icon className="w-3.5 h-3.5 mr-1.5" /> {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto bg-[#fafbfc]">
                <TabsContent value="design" className="m-0">
                  <DesignTab />
                </TabsContent>
                <TabsContent value="run" className="m-0">
                  <DebugTab />
                </TabsContent>
                <TabsContent value="doc" className="m-0">
                  <DocTab />
                </TabsContent>
                <TabsContent value="settings" className="m-0">
                  <SettingsTab />
                </TabsContent>
                <TabsContent value="logs" className="m-0 animate-in fade-in duration-300">
                  <LogsPlaceholder />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          <EmptyState onCreateNew={createNew} />
        )}
      </div>

      {/* Group Modal */}
      <GroupModal />
    </div>
  )
}

// ── Sub-components ──

interface EndpointHeaderProps {
  formMethod: HttpMethod
  formPath: string
  groupId: number
  datasourceId: number
  groups: { id?: number; name?: string }[]
  dataSources: { id: number; name: string }[]
  saving: boolean
  isNew: boolean
  onMethodChange: (method: HttpMethod) => void
  onPathChange: (path: string) => void
  onGroupChange: (id: number) => void
  onDatasourceChange: (id: number) => void
  onReset: () => void
  onSave: () => void
}

function EndpointHeader({
  formMethod, formPath, groupId, datasourceId,
  groups, dataSources, saving, isNew,
  onMethodChange, onPathChange, onGroupChange, onDatasourceChange,
  onReset, onSave,
}: EndpointHeaderProps) {
  return (
    <div className="h-16 border-b border-zinc-100 flex items-center justify-between px-6 bg-white shrink-0">
      <div className="flex-1 flex items-center gap-3 min-w-0 pr-6">
        <Select value={formMethod} onValueChange={v => onMethodChange(v as HttpMethod)}>
          <SelectTrigger className={cn(
            "flex-shrink-0 h-8 w-24 rounded-lg border-2 text-[10px] font-black uppercase tracking-wider",
            formMethod === "GET" ? "bg-blue-50 text-blue-600 border-blue-100"
              : formMethod === "POST" ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : formMethod === "PUT" ? "bg-amber-50 text-amber-600 border-amber-100"
              : formMethod === "DELETE" ? "bg-red-50 text-red-600 border-red-100"
              : "bg-zinc-50 text-zinc-600 border-zinc-200"
          )}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="text"
          value={formPath}
          onChange={e => onPathChange(e.target.value)}
          placeholder="/api/v1/new-endpoint"
          className="flex-1 min-w-0 bg-transparent border-none px-0 py-0 h-full text-base font-bold text-zinc-900 tracking-tight focus:outline-none focus:ring-0 placeholder:text-zinc-300"
        />

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg h-8 px-2.5 transition-colors focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-blue-300">
            <Folder className="w-3.5 h-3.5 text-zinc-400" />
            <Select value={String(groupId)} onValueChange={v => onGroupChange(Number(v))}>
              <SelectTrigger className="h-7 border-none shadow-none bg-transparent text-[11px] font-bold p-0 min-w-[60px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">未分类</SelectItem>
                {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg h-8 px-2.5 transition-colors focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-blue-300">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <Select value={String(datasourceId)} onValueChange={v => onDatasourceChange(Number(v))}>
              <SelectTrigger className="h-7 border-none shadow-none bg-transparent text-[11px] font-bold p-0 min-w-[60px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {dataSources.map(ds => <SelectItem key={ds.id} value={String(ds.id)}>{ds.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onReset} className="h-8 px-4 text-xs font-medium text-zinc-500 hover:text-zinc-700 rounded-lg">
          重置
        </Button>
        <Button onClick={onSave} disabled={saving} className="h-8 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 rounded-lg">
          <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? "保存中..." : isNew ? "创建" : "保存"}
        </Button>
      </div>
    </div>
  )
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-16 bg-white">
      <div className="w-16 h-16 rounded-lg bg-blue-50/30 border border-blue-100 flex items-center justify-center mb-6 shadow-sm">
        <Terminal className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-bold text-zinc-800 tracking-tight mb-2">开启 API 设计之旅</h3>
      <p className="text-sm text-zinc-400 max-w-sm font-medium leading-relaxed mb-8">
        从左侧选择接口编辑，或创建一个全新的 API 接口。
      </p>
      <Button onClick={onCreateNew} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 group">
        <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" /> 创建 API 接口
      </Button>
    </div>
  )
}

function LogsPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-16 bg-white min-h-[400px]">
      <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center mb-5 border border-zinc-100">
        <ScrollText className="w-7 h-7 text-zinc-300" />
      </div>
      <h3 className="text-sm font-bold text-zinc-700 tracking-tight">访问日志即将上线</h3>
      <p className="text-xs text-zinc-400 mt-2 max-w-xs text-center leading-relaxed">
        高性能日志模块正在开发中，未来可在此查看接口调用频次和延迟分析。
      </p>
    </div>
  )
}
