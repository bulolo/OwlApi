"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ChevronRight, Search, Trash2, PanelLeftClose, PanelLeftOpen, FileCode, Folder, FolderPlus, MoreVertical, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEndpointStore } from "../_store/useEndpointStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import type { ApiEndpoint, ApiGroup, HttpMethod } from "../_types"

export function ApiSidebar() {
  const { activeTenant, projectId } = useTenantProject()
  const sidebarOpen = useEndpointStore(s => s.sidebarOpen)
  const setSidebarOpen = useEndpointStore(s => s.setSidebarOpen)
  const searchTerm = useEndpointStore(s => s.searchTerm)
  const setSearchTerm = useEndpointStore(s => s.setSearchTerm)
  const loading = useEndpointStore(s => s.loading)
  const groups = useEndpointStore(s => s.groups)
  const endpoints = useEndpointStore(s => s.endpoints)
  const selectedId = useEndpointStore(s => s.selectedId)
  const expandedGroups = useEndpointStore(s => s.expandedGroups)
  const toggleGroup = useEndpointStore(s => s.toggleGroup)
  const selectEndpoint = useEndpointStore(s => s.selectEndpoint)
  const deleteEndpoint = useEndpointStore(s => s.deleteEndpoint)
  const createNew = useEndpointStore(s => s.createNew)
  const openGroupModal = useEndpointStore(s => s.openGroupModal)
  const deleteGroup = useEndpointStore(s => s.deleteGroup)

  const filteredEndpoints = endpoints.filter(ep =>
    (ep.path ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!sidebarOpen) {
    return (
      <button
        className="h-auto w-11 shrink-0 flex flex-col items-center py-5 bg-[#fafbfc] border-r border-zinc-200/80 hover:bg-white transition-all group animate-in slide-in-from-left-4"
        onClick={() => setSidebarOpen(true)}
      >
        <PanelLeftOpen className="w-4 h-4 text-zinc-400 mb-3 group-hover:text-blue-600 transition-colors" />
        <span className="text-[10px] font-bold text-zinc-400 [writing-mode:vertical-lr] tracking-[0.15em] group-hover:text-zinc-600 transition-colors">导航</span>
      </button>
    )
  }

  return (
    <div className="w-[272px] shrink-0 flex flex-col bg-[#fafbfc] border-r border-zinc-200/80 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200/80 bg-white flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em] px-0.5">接口导航</span>
          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-zinc-400 transition-all" title="新建接口" onClick={createNew}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-zinc-400 transition-all" title="新建分组" onClick={() => openGroupModal("create")}>
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-all" onClick={() => setSidebarOpen(false)}>
              <PanelLeftClose className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-300" />
          <Input
            placeholder="搜索接口路径..."
            className="pl-9 h-8 text-xs bg-zinc-50/80 border-zinc-200/60 rounded-lg focus-visible:ring-blue-500/15 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Endpoint List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <div className="p-8 text-center text-zinc-400 text-xs">加载中...</div>
        ) : (
          <div className="flex flex-col py-1">
            {(groups as ApiGroup[]).concat([{ id: -1, name: "未分类接口" } as ApiGroup]).map(group => {
              const isUngrouped = group.id === -1
              const items = filteredEndpoints.filter(ep => isUngrouped ? !ep.group_id : ep.group_id === group.id)
              if (isUngrouped && items.length === 0) return null

              return (
                <div key={group.id}>
                  {/* Group Header */}
                  <div
                    onClick={() => toggleGroup(group.id ?? 0)}
                    className="px-4 py-2.5 flex items-center justify-between group/g hover:bg-zinc-100/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={cn(
                        "w-3 h-3 text-zinc-400 transition-transform duration-200",
                        expandedGroups.includes(group.id ?? 0) && "rotate-90"
                      )} />
                      <Folder className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[11px] font-semibold text-zinc-500 tracking-wide">{group.name}</span>
                      <span className="text-[10px] text-zinc-400 font-medium bg-zinc-100/80 px-1.5 py-0 rounded-md">{items.length}</span>
                    </div>
                    {!isUngrouped && group.id !== undefined && (
                      <div className="flex items-center opacity-0 group-hover/g:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-white rounded-md transition-all outline-none shadow-sm border border-transparent hover:border-zinc-200">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-lg shadow-md border-zinc-200 p-1.5">
                            <DropdownMenuItem onClick={() => openGroupModal("edit", group)} className="text-xs font-medium py-2 rounded-md">
                              <Edit3 className="w-3.5 h-3.5 mr-2.5 text-zinc-400" /> 重命名
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteGroup(activeTenant, projectId, group.id!)} className="text-xs font-medium py-2 rounded-md text-red-600 focus:text-red-900 focus:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5 mr-2.5" /> 删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  {/* Endpoints */}
                  {expandedGroups.includes(group.id ?? 0) && (
                    <div className="space-y-0.5 pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {items.length === 0 ? (
                        <div className="mx-4 pl-7 py-2 text-[11px] text-zinc-400 italic">空分组</div>
                      ) : (
                        items.map((ep, idx) => (
                          <div
                            key={ep.id || `new-${idx}`}
                            onClick={() => selectEndpoint(ep)}
                            className={cn(
                              "mx-2 px-3 py-2 cursor-pointer transition-all duration-200 group flex items-center justify-between rounded-xl font-medium",
                              selectedId === ep.id
                                ? "bg-blue-50 text-blue-600"
                                : "hover:bg-white hover:shadow-sm text-zinc-600"
                            )}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2.5">
                              <MethodBadge method={ep.methods?.[0] as HttpMethod | undefined} isSelected={selectedId === ep.id} />
                              <span className={cn(
                                "text-[12px] font-medium truncate",
                                selectedId === ep.id ? "text-blue-600 font-bold" : "text-zinc-600 group-hover:text-zinc-900"
                              )}>
                                {ep.path ?? ""}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Button variant="ghost" size="icon" className={cn(
                                "w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
                                selectedId === ep.id ? "hover:bg-blue-100 text-blue-400 hover:text-blue-600" : "hover:bg-red-50 hover:text-red-500 text-zinc-300"
                              )} onClick={(e) => { e.stopPropagation(); deleteEndpoint(activeTenant, projectId, ep) }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {groups.length === 0 && (
              <div className="p-10 text-center">
                <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                  <FileCode className="w-7 h-7 text-zinc-300" />
                </div>
                <p className="text-zinc-500 text-sm font-semibold">暂无接口分组</p>
                <p className="text-zinc-400 text-xs mt-1">创建分组以管理接口</p>
                <Button variant="outline" className="mt-5 text-xs h-8 px-4 rounded-lg border-zinc-200 hover:bg-zinc-50" onClick={() => openGroupModal("create")}>
                  <Plus className="w-3.5 h-3.5 mr-2" /> 创建分组
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MethodBadge({ method, isSelected }: { method?: HttpMethod; isSelected: boolean }) {
  const colorClass = isSelected
    ? method === "GET" ? "bg-blue-100 text-blue-700 border-blue-200"
      : method === "POST" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : method === "PUT" ? "bg-amber-100 text-amber-700 border-amber-200"
      : method === "DELETE" ? "bg-red-100 text-red-700 border-red-200"
      : "bg-zinc-200 text-zinc-600 border-zinc-300"
    : method === "GET" ? "bg-blue-50 text-blue-600 border-blue-200/60"
    : method === "POST" ? "bg-emerald-50 text-emerald-600 border-emerald-200/60"
    : method === "PUT" ? "bg-amber-50 text-amber-600 border-amber-200/60"
    : method === "DELETE" ? "bg-red-50 text-red-600 border-red-200/60"
    : "bg-zinc-100 text-zinc-500 border-zinc-200"

  return (
    <span className={cn("font-black text-[9px] w-10 text-center py-0.5 rounded-md border transition-colors shrink-0", colorClass)}>
      {method}
    </span>
  )
}
