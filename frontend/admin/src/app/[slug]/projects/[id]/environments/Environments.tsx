"use client"

import { useState } from "react"
import { useTenant } from "@/providers/TenantProvider"
import {
  useEnvironments,
  useCreateEnvironment,
  useRenameEnvironment,
  useSetDefaultEnvironment,
  useDeleteEnvironment,
  useDataSources,
  useEnvBindings,
  useUpsertBinding,
  useDeleteBinding,
} from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Trash2, Star, Pencil, Circle, Check, X, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { showConfirm } from "@/store/useConfirmStore"
import type { EnvironmentResp as ProjectEnvironment } from "@/lib/sdk"
import { envColor } from "../_utils/envColor"
import { ENV_PRESETS } from "../../_utils/envPresets"
import Link from "next/link"

interface Props {
  projectId: number
  /** Sheet 模式下由父级传入关闭回调；独立页面模式下不传 */
  onClose?: () => void
}

export default function Environments({ projectId, onClose }: Props) {
  const activeTenant = useTenant()
  const { data: envs = [], isLoading } = useEnvironments(activeTenant, projectId)
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const selected = envs.find(e => e.id === selectedEnvId) ?? envs[0]

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-6">加载中...</div>
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 独立页面模式：显示返回按钮；Sheet 模式：Sheet 自带关闭按钮 */}
      {!onClose && (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle shrink-0">
          <Link href={`/${activeTenant}/projects/${projectId}/apis`}>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-zinc-100">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Button>
          </Link>
          <h2 className="text-sm font-bold tracking-tight">环境管理</h2>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[220px_1fr] gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">环境列表</h2>
              <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-xs font-bold">
                <Plus className="w-3.5 h-3.5 mr-1" /> 新增
              </Button>
            </div>

            <div className="space-y-2">
              {envs.map(env => (
                <EnvRow
                  key={env.id}
                  env={env}
                  active={selected?.id === env.id}
                  projectId={projectId}
                  onSelect={() => setSelectedEnvId(env.id)}
                />
              ))}
            </div>
          </div>

          <div>
            {selected ? (
              <BindingsPanel projectId={projectId} env={selected} />
            ) : (
              <p className="text-sm text-muted-foreground">请选择左侧的环境</p>
            )}
          </div>
        </div>
      </div>

      <CreateEnvDialog
        open={showCreate}
        projectId={projectId}
        envs={envs}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}

function EnvRow({
  env,
  active,
  projectId,
  onSelect,
}: {
  env: ProjectEnvironment
  active: boolean
  projectId: number
  onSelect: () => void
}) {
  const activeTenant = useTenant()
  const renameMu = useRenameEnvironment(activeTenant, projectId, env.id)
  const defaultMu = useSetDefaultEnvironment(activeTenant, projectId)
  const deleteMu = useDeleteEnvironment(activeTenant, projectId)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(env.name)

  const handleRename = () => {
    if (!name || name === env.name) return
    renameMu.mutate({ name }, {
      onSuccess: () => toast.success(`已重命名为 "${name}"`),
      onError: (err: unknown) => toast.error("重命名失败: " + (err instanceof Error ? err.message : "未知错误")),
    })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (env.is_default) return toast.error("默认环境不可删除")
    if (!await showConfirm(`确定删除环境 "${env.name}" 吗？该环境内所有绑定与激活将一并清除`)) return
    deleteMu.mutate(env.id)
  }

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-colors border-border-subtle shadow-card",
        active ? "border-primary/40 bg-primary/5" : "hover:bg-zinc-50",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <Circle className={`w-2.5 h-2.5 shrink-0 ${envColor(env.name).dot}`} />
        {editing ? (
          <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleRename()
                if (e.key === "Escape") { setName(env.name); setEditing(false) }
              }}
              className="h-7 text-xs"
            />
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={handleRename}
              disabled={!name || name === env.name}
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => { setName(env.name); setEditing(false) }}
            >
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </Button>
          </div>
        ) : (
          <>
            <span className="font-bold text-sm tracking-tight flex-1">{env.name}</span>
            {env.is_default && (
              <span className="text-2xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">DEFAULT</span>
            )}
          </>
        )}
        {!editing && (
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <Button size="icon-xs" variant="ghost" title="重命名" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            {!env.is_default && (
              <Button size="icon-xs" variant="ghost" title="设为默认" onClick={() => defaultMu.mutate(env.id)}>
                <Star className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
            {!env.is_default && (
              <Button size="icon-xs" variant="ghost" title="删除" onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function BindingsPanel({ projectId, env }: { projectId: number; env: ProjectEnvironment }) {
  const activeTenant = useTenant()
  const { data: bindings = [], isLoading: bLoading } = useEnvBindings(activeTenant, projectId, env.id)
  const { dataSources } = useDataSources(activeTenant, { is_pager: 0 })
  const upsert = useUpsertBinding(activeTenant, projectId, env.id)
  const removeBinding = useDeleteBinding(activeTenant, projectId, env.id)
  const [newAlias, setNewAlias] = useState("")
  const [newDsId, setNewDsId] = useState<number | null>(null)
  const [editingAlias, setEditingAlias] = useState<string | null>(null)
  const [editingDsId, setEditingDsId] = useState<number | null>(null)

  const dsMap = new Map(dataSources.map(d => [d.id, d]))

  const handleAdd = () => {
    if (!newAlias) return toast.error("请输入别名")
    if (!newDsId) return toast.error("请选择数据源")
    upsert.mutate({ alias: newAlias, datasource_id: newDsId }, {
      onSuccess: () => {
        setNewAlias("")
        setNewDsId(null)
      },
    })
  }

  const handleEditSave = (alias: string) => {
    if (!editingDsId) return
    upsert.mutate({ alias, datasource_id: editingDsId }, {
      onSuccess: () => setEditingAlias(null),
    })
  }

  return (
    <Card className="p-5 border-border-subtle shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
          <Circle className={`w-3 h-3 ${envColor(env.name).dot}`} /> {env.name}
        </h3>
      </div>

      <details className="mb-4 rounded-lg border border-primary/20 bg-primary/5 text-xs">
        <summary className="cursor-pointer px-3.5 py-2.5 font-bold text-primary select-none list-none flex items-center gap-1.5">
          <span className="text-primary/60 text-[10px]">▶</span> 什么是别名？
        </summary>
        <div className="px-3.5 pb-3.5 pt-1 leading-relaxed space-y-2">
          <p className="text-zinc-700">别名是 endpoint 引用数据源的<strong>逻辑名字</strong>，例如：</p>
          <ul className="space-y-1 ml-1">
            <li className="flex items-center gap-2">
              <span className="font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-2xs shrink-0">main</span>
              <span className="text-zinc-600">→ 业务库（users / orders）</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-2xs shrink-0">analytics</span>
              <span className="text-zinc-600">→ 数仓库（daily_revenue）</span>
            </li>
          </ul>
          <p className="text-muted-foreground">不同环境里同一别名指向不同物理库，endpoint 无需改动。</p>
        </div>
      </details>

      <div className="space-y-3">
        <Label className="text-2xs font-bold text-muted-foreground uppercase">现有绑定</Label>
        {bLoading ? (
          <p className="text-xs text-muted-foreground">加载中...</p>
        ) : bindings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">尚未绑定任何别名</p>
        ) : (
          <div className="space-y-2">
            {bindings.map(b => {
              const ds = dsMap.get(b.datasource_id)
              const isEditing = editingAlias === b.alias
              return (
                <div key={b.alias} className="flex items-center gap-3 p-2 border border-border-subtle rounded-lg bg-white">
                  <span className="font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded shrink-0">
                    {b.alias}
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                  {isEditing ? (
                    <>
                      <Select value={editingDsId ? String(editingDsId) : ""} onValueChange={v => setEditingDsId(Number(v))}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="选择数据源..." />
                        </SelectTrigger>
                        <SelectContent>
                          {dataSources.map(d => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              <span className="font-bold">{d.name}</span>
                              <span className="ml-2 text-2xs text-muted-foreground">{d.type}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon-xs" variant="ghost" onClick={() => handleEditSave(b.alias)} disabled={!editingDsId || editingDsId === b.datasource_id}>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </Button>
                      <Button size="icon-xs" variant="ghost" onClick={() => setEditingAlias(null)}>
                        <X className="w-3.5 h-3.5 text-zinc-400" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold flex-1">{ds?.name ?? `(已删除 #${b.datasource_id})`}</span>
                      {ds && <span className="text-2xs text-muted-foreground font-mono">{ds.type}</span>}
                      <Button size="icon-xs" variant="ghost" title="修改数据源" onClick={() => { setEditingAlias(b.alias); setEditingDsId(b.datasource_id) }}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon-xs" variant="ghost" onClick={() => removeBinding.mutate(b.alias)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-border-subtle space-y-3">
        <Label className="text-2xs font-bold text-muted-foreground uppercase">新增绑定</Label>
        <div className="flex items-center gap-2">
          <Input
            placeholder="别名（例如 main / analytics）"
            value={newAlias}
            onChange={e => setNewAlias(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd() }}
            className="h-9 text-xs flex-1"
          />
          <Select value={newDsId ? String(newDsId) : ""} onValueChange={v => setNewDsId(Number(v))}>
            <SelectTrigger className="h-9 text-xs w-[220px]">
              <SelectValue placeholder="选择数据源..." />
            </SelectTrigger>
            <SelectContent>
              {dataSources.map(ds => (
                <SelectItem key={ds.id} value={String(ds.id)}>
                  <span className="font-bold">{ds.name}</span>
                  <span className="ml-2 text-2xs text-muted-foreground">{ds.type}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} className="h-9 text-xs font-bold">
            <Plus className="w-3.5 h-3.5 mr-1" /> 添加
          </Button>
        </div>
      </div>
    </Card>
  )
}

function CreateEnvDialog({
  open,
  projectId,
  envs,
  onClose,
}: {
  open: boolean
  projectId: number
  envs: ProjectEnvironment[]
  onClose: () => void
}) {
  const activeTenant = useTenant()
  const create = useCreateEnvironment(activeTenant, projectId)
  // 仅展示尚未创建的预设环境；环境名唯一，已存在的不再可选。
  const usedNames = new Set(envs.map(e => e.name))
  const available = ENV_PRESETS.filter(p => !usedNames.has(p.value))
  const [name, setName] = useState(available[0]?.value ?? "")
  const [copyFromId, setCopyFromId] = useState<number>(envs.find(e => e.is_default)?.id ?? 0)
  const [copyBindings, setCopyBindings] = useState(false)

  const submit = () => {
    if (!name) return toast.error("请选择环境")
    create.mutate(
      { name, copy_from_env_id: copyFromId || undefined, copy_bindings: copyBindings },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[420px]">
        <DialogHeader>
          <DialogTitle>新增环境</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">环境</Label>
            {available.length === 0 ? (
              <p className="text-2xs text-muted-foreground">常见环境已全部创建。</p>
            ) : (
              <Select value={name} onValueChange={setName}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="选择环境..." />
                </SelectTrigger>
                <SelectContent>
                  {available.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-2xs text-muted-foreground">从常见环境中选择，确保 prod / dev 等名称语义统一。</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">从模板克隆 handle 列表</Label>
            <Select value={String(copyFromId)} onValueChange={v => setCopyFromId(Number(v))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="不克隆..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">(不克隆)</SelectItem>
                {envs.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="copy-bindings"
              checked={copyBindings}
              onChange={e => setCopyBindings(e.target.checked)}
              disabled={!copyFromId}
            />
            <Label htmlFor="copy-bindings" className="text-xs font-bold cursor-pointer">
              一并复制 datasource 绑定（多数情况下你想为新环境分别绑定不同的物理库，所以默认不勾）
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-9 text-xs font-bold">取消</Button>
          <Button onClick={submit} className="h-9 text-xs font-bold" disabled={create.isPending || !name}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
