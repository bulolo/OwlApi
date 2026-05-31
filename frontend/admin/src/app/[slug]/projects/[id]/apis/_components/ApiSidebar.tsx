"use client"

import { useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ChevronRight, Search, Trash2, PanelLeftClose, PanelLeftOpen, FileCode, Folder, FolderPlus, MoreVertical, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useTenantProject } from "../_hooks/useTenantProject"
import { useEndpointsQuery, useDeleteEndpoint, useUpdateEndpointGroup } from "../_hooks/useEndpointsQuery"
import { useGroupsQuery, useDeleteGroup } from "../_hooks/useGroupsQuery"
import { showConfirm } from "@/store/useConfirmStore"
import type { ApiEndpoint, ApiGroup, HttpMethod } from "../_types"

interface ApiSidebarProps {
  onSelectEndpoint: (ep: ApiEndpoint) => void
  onCreateNew: () => void
}

export function ApiSidebar({ onSelectEndpoint, onCreateNew }: ApiSidebarProps) {
  const { activeTenant, projectId } = useTenantProject()

  const sidebarOpen = useApiEditorStore(s => s.sidebarOpen)
  const setSidebarOpen = useApiEditorStore(s => s.setSidebarOpen)
  const searchTerm = useApiEditorStore(s => s.searchTerm)
  const setSearchTerm = useApiEditorStore(s => s.setSearchTerm)
  const selectedId = useApiEditorStore(s => s.selectedId)
  const expandedGroups = useApiEditorStore(s => s.expandedGroups)
  const toggleGroup = useApiEditorStore(s => s.toggleGroup)
  const openGroupModal = useApiEditorStore(s => s.openGroupModal)

  const { list: endpoints, isLoading } = useEndpointsQuery(activeTenant, projectId)
  const { list: groups } = useGroupsQuery(activeTenant, projectId)

  // useSyncExternalStore gives false on server and true on client,
  // ensuring both start with the same loading state during hydration.
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false)

  const deleteEndpoint = useDeleteEndpoint(activeTenant, projectId)
  const deleteGroup = useDeleteGroup(activeTenant, projectId)
  const updateGroup = useUpdateEndpointGroup(activeTenant, projectId)

  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null)

  const filteredEndpoints = endpoints.filter(ep =>
    (ep.path ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleDelete(ep: ApiEndpoint) {
    if (!ep.id) return
    const ok = await showConfirm(`确定删除接口 ${ep.path ?? ""}？`)
    if (!ok) return
    deleteEndpoint.mutate(ep.id)
  }

  async function handleDeleteGroup(gid: number) {
    const ok = await showConfirm("确定删除分组？分组内接口将移至未分类。")
    if (!ok) return
    deleteGroup.mutate(gid)
  }

  function handleDrop(e: React.DragEvent, groupId: number) {
    e.preventDefault()
    setDragOverGroupId(null)
    const endpointId = Number(e.dataTransfer.getData("endpoint-id"))
    if (!endpointId) return
    const ep = endpoints.find(ep => ep.id === endpointId)
    if (!ep) return
    updateGroup.mutate({ ep, groupId })
  }

  if (!sidebarOpen) {
    return (
      <button
        className="h-auto w-11 shrink-0 flex flex-col items-center py-5 bg-zinc-50/60 border-r border-border/80 hover:bg-white transition-all group animate-in slide-in-from-left-4"
        onClick={() => setSidebarOpen(true)}
      >
        <PanelLeftOpen className="w-4 h-4 text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
        <span className="text-2xs font-bold text-muted-foreground [writing-mode:vertical-lr] tracking-[0.15em] group-hover:text-zinc-600 transition-colors">导航</span>
      </button>
    )
  }

  const allGroups: ApiGroup[] = [...(groups as ApiGroup[]), { id: -1, name: "未分类接口" } as ApiGroup]

  return (
    <div className="w-[272px] shrink-0 flex flex-col bg-zinc-50/60 border-r border-border/80 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="p-4 border-b border-border/80 bg-white flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-black text-muted-foreground uppercase tracking-[0.15em] px-0.5">接口导航</span>
          <div className="flex items-center gap-0.5">
            <Button size="icon-xs" variant="ghost" className="rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground" title="新建接口" onClick={onCreateNew}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon-xs" variant="ghost" className="rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground" title="新建分组" onClick={() => openGroupModal("create")}>
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon-xs" variant="ghost" className="rounded-lg hover:bg-zinc-100 text-muted-foreground" onClick={() => setSidebarOpen(false)}>
              <PanelLeftClose className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索接口路径..."
            className="pl-9 h-8 text-xs bg-zinc-50/80 border-border/60 rounded-lg focus-visible:ring-primary/20 placeholder:text-muted-foreground"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {!isClient || isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-xs">加载中...</div>
        ) : (
          <div className="flex flex-col py-1">
            {allGroups.map(group => {
              const isUngrouped = group.id === -1
              const items = filteredEndpoints.filter(ep =>
                isUngrouped ? !ep.group_id : ep.group_id === group.id
              )
              if (isUngrouped && items.length === 0) return null

              const isDragTarget = dragOverGroupId === group.id

              const dropGroupId = group.id === -1 ? 0 : (group.id ?? 0)

              return (
                <div
                  key={group.id}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverGroupId(group.id ?? -1) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverGroupId(null) }}
                  onDrop={e => handleDrop(e, dropGroupId)}
                >
                  {/* Group header */}
                  <div
                    onClick={() => toggleGroup(group.id ?? 0)}
                    className={cn(
                      "px-4 py-2.5 flex items-center justify-between group/g cursor-pointer transition-colors",
                      isDragTarget
                        ? "bg-primary/10 border-l-2 border-primary/60"
                        : "hover:bg-zinc-100/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={cn(
                        "w-3 h-3 text-muted-foreground transition-transform duration-200",
                        expandedGroups.includes(group.id ?? 0) && "rotate-90"
                      )} />
                      <Folder className={cn("w-3.5 h-3.5 transition-colors", isDragTarget ? "text-primary/80" : "text-muted-foreground")} />
                      <span className={cn("text-xs font-bold tracking-wide transition-colors", isDragTarget ? "text-primary" : "text-muted-foreground")}>
                        {group.name}
                      </span>
                      <span className="text-2xs text-muted-foreground font-medium bg-zinc-100/80 px-1.5 py-0 rounded-md">{items.length}</span>
                    </div>
                    {!isUngrouped && group.id !== undefined && (
                      <div className="flex items-center opacity-0 group-hover/g:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 text-muted-foreground hover:text-zinc-700 hover:bg-white rounded-md transition-all outline-none shadow-sm border border-transparent hover:border-border">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-lg shadow-modal border-border p-1.5">
                            <DropdownMenuItem onClick={() => openGroupModal("edit", group)} className="text-xs font-medium py-2 rounded-md">
                              <Edit3 className="w-3.5 h-3.5 mr-2.5 text-muted-foreground" /> 重命名
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteGroup(group.id!)} className="text-xs font-medium py-2 rounded-md text-red-600 focus:text-red-900 focus:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5 mr-2.5" /> 删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  {expandedGroups.includes(group.id ?? 0) && (
                    <div className="space-y-0.5 pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {items.length === 0 ? (
                        <div className="mx-4 pl-7 py-2 text-xs text-muted-foreground italic">空分组</div>
                      ) : (
                        items.map((ep, idx) => (
                          <EndpointItem
                            key={ep.id || `new-${idx}`}
                            ep={ep}
                            isSelected={selectedId === ep.id}
                            onSelect={() => onSelectEndpoint(ep)}
                            onDelete={() => handleDelete(ep)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {groups.length === 0 && (
              <div className="p-10 text-center">
                <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-border-subtle">
                  <FileCode className="w-7 h-7 text-zinc-300" />
                </div>
                <p className="text-muted-foreground text-sm font-bold">暂无接口分组</p>
                <p className="text-muted-foreground text-xs mt-1">创建分组以管理接口</p>
                <Button variant="outline" className="mt-5 text-xs h-8 px-4 rounded-lg border-border hover:bg-zinc-50" onClick={() => openGroupModal("create")}>
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

/**
 * 聚合所有 env 的状态：
 *   - 任意 env 已激活 + 草稿有改动 → amber (有未发布修改)
 *   - 任意 env 已激活 + latest 版本未上线 → primary (新版本待上线)
 *   - 任意 env 已激活 → emerald (健康)
 *   - 有版本但所有 env 都未激活 → zinc (草稿/已下线)
 *   - 从未发版 → amber-dim
 */
function StatusDot({ ep }: { ep: ApiEndpoint }) {
  const anyActive = (ep.env_activations?.length ?? 0) > 0
  const latest = ep.latest_version ?? 0
  const maxActive = (ep.env_activations ?? []).reduce((max, a) => Math.max(max, a.version), 0)
  const hasPending = anyActive && !ep.has_draft && latest > maxActive

  const color =
    !anyActive
      ? latest > 0 ? "bg-zinc-400"
      : "bg-amber-400"
    : ep.has_draft  ? "bg-amber-500"
    : hasPending    ? "bg-primary"
    : "bg-emerald-500"

  return <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full", color)} />
}

function EndpointItem({ ep, isSelected, onSelect, onDelete }: {
  ep: ApiEndpoint
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const isPublishedAnywhere = (ep.env_activations?.length ?? 0) > 0

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("endpoint-id", String(ep.id ?? ""))
        e.dataTransfer.effectAllowed = "move"
      }}
      onClick={onSelect}
      className={cn(
        "mx-2 px-3 py-2 cursor-pointer transition-all duration-200 group flex items-center gap-2 rounded-xl font-medium",
        isSelected ? "bg-primary/10" : "hover:bg-white hover:shadow-sm"
      )}
    >
      <StatusDot ep={ep} />
      <MethodBadge method={ep.method as HttpMethod | undefined} isSelected={isSelected} />
      <span className={cn(
        "flex-1 text-xs font-medium truncate min-w-0",
        isSelected ? "text-primary font-bold" : "text-zinc-600 group-hover:text-foreground"
      )}>
        {ep.path ?? ""}
      </span>
      {isPublishedAnywhere && ep.has_draft && (
        <span
          className="shrink-0 text-2xs font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-500 border border-amber-200 leading-tight"
          title="草稿有未发布修改"
        >
          NEW
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-zinc-700 hover:bg-zinc-100 transition-all outline-none"
            onClick={e => e.stopPropagation()}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 rounded-lg shadow-modal border-border p-1">
          <DropdownMenuItem
            // 任何 env 上线中都禁止删除——必须先全部下线（在版本管理里做）。
            disabled={isPublishedAnywhere}
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="text-xs font-medium py-2 rounded-md text-red-600 focus:text-red-900 focus:bg-red-50 data-[disabled]:text-zinc-300 data-[disabled]:cursor-not-allowed"
            title={isPublishedAnywhere ? "请先在版本管理里把所有 env 下线" : undefined}
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除{isPublishedAnywhere ? "（先下线）" : ""}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function MethodBadge({ method, isSelected }: { method?: HttpMethod; isSelected: boolean }) {
  const colorClass = isSelected
    ? method === "GET" ? "bg-primary/20 text-primary border-primary/30"
      : method === "POST" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : method === "PUT" ? "bg-amber-100 text-amber-700 border-amber-200"
      : method === "DELETE" ? "bg-red-100 text-red-700 border-red-200"
      : "bg-zinc-200 text-zinc-600 border-border"
    : method === "GET" ? "bg-primary/10 text-primary border-primary/30"
    : method === "POST" ? "bg-emerald-50 text-emerald-600 border-emerald-200/60"
    : method === "PUT" ? "bg-amber-50 text-amber-600 border-amber-200/60"
    : method === "DELETE" ? "bg-red-50 text-red-600 border-red-200/60"
    : "bg-zinc-100 text-muted-foreground border-border"

  return (
    <span className={cn("font-black text-2xs w-10 text-center py-0.5 rounded-md border transition-colors shrink-0", colorClass)}>
      {method}
    </span>
  )
}
