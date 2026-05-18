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
import { Plus, Trash2, Star, Pencil, Circle, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { showConfirm } from "@/store/useConfirmStore"
import type { ProjectEnvironment } from "@/lib/api-client"

import { envColor } from "../_utils/envColor"

export default function EnvironmentsClientPage({ projectId }: { projectId: number }) {
  const activeTenant = useTenant()
  const { data: envs = [], isLoading } = useEnvironments(activeTenant, projectId)
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const selected = envs.find(e => e.id === selectedEnvId) ?? envs[0]

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-4 space-y-3">
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

      <div className="col-span-12 md:col-span-8">
        {selected ? (
          <BindingsPanel projectId={projectId} env={selected} />
        ) : (
          <p className="text-sm text-muted-foreground">请选择左侧的环境</p>
        )}
      </div>

      {showCreate && (
        <CreateEnvDialog
          projectId={projectId}
          envs={envs}
          onClose={() => setShowCreate(false)}
        />
      )}
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
              className="h-7 text-xs"
            />
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => { renameMu.mutate({ name }); setEditing(false) }}
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
            <Button
              size="icon-xs"
              variant="ghost"
              title="重命名"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            {!env.is_default && (
              <Button
                size="icon-xs"
                variant="ghost"
                title="设为默认"
                onClick={() => defaultMu.mutate(env.id)}
              >
                <Star className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
            {!env.is_default && (
              <Button
                size="icon-xs"
                variant="ghost"
                title="删除"
                onClick={handleDelete}
              >
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
  const [newDsId, setNewDsId] = useState<number>(0)

  const dsMap = new Map(dataSources.map(d => [d.id, d]))

  const handleAdd = () => {
    if (!newAlias) return toast.error("请输入别名")
    if (!newDsId) return toast.error("请选择数据源")
    upsert.mutate({ alias: newAlias, datasource_id: newDsId }, {
      onSuccess: () => {
        setNewAlias("")
        setNewDsId(0)
      },
    })
  }

  return (
    <Card className="p-5 border-border-subtle shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
            <Circle className={`w-3 h-3 ${envColor(env.name).dot}`} /> {env.name}
          </h3>
        </div>
      </div>

      {/* 概念解释 — 用业务库/数仓库的真实例子，避免抽象 */}
      <div className="mb-5 p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs leading-relaxed">
        <p className="font-bold text-primary mb-1.5">什么是别名？</p>
        <p className="text-zinc-700 mb-2">
          别名是项目里 endpoint 引用数据源的<strong>逻辑名字</strong>。一个项目通常会有多个数据库，比如：
        </p>
        <ul className="space-y-1 ml-1">
          <li className="flex items-start gap-2">
            <span className="font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-2xs shrink-0">main</span>
            <span className="text-zinc-600">→ <strong>业务库</strong>，跑 users / orders / products 这些 OLTP 表</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-2xs shrink-0">analytics</span>
            <span className="text-zinc-600">→ <strong>数仓库</strong>，跑 daily_revenue / category_sales 这些预聚合统计表</span>
          </li>
        </ul>
        <p className="mt-2.5 text-muted-foreground">
          在 <code className="font-mono bg-zinc-100 px-1 rounded text-zinc-700">{env.name}</code> 环境里，每个别名指向<strong>哪个物理数据源</strong>由下面的绑定决定。
          切换到 dev 环境，同一个 <code className="font-mono bg-zinc-100 px-1 rounded">main</code> 可以指向开发库——endpoint 不用改一行。
        </p>
      </div>

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
              return (
                <div key={b.alias} className="flex items-center gap-3 p-2 border border-border-subtle rounded-lg bg-white">
                  <span className="font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded">
                    {b.alias}
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-sm font-bold flex-1">{ds?.name ?? `(已删除 #${b.datasource_id})`}</span>
                  {ds && (
                    <span className="text-2xs text-muted-foreground font-mono">{ds.type}</span>
                  )}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => removeBinding.mutate(b.alias)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                  </Button>
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
            className="h-9 text-xs flex-1"
          />
          <Select value={String(newDsId)} onValueChange={v => setNewDsId(Number(v))}>
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
  projectId,
  envs,
  onClose,
}: {
  projectId: number
  envs: ProjectEnvironment[]
  onClose: () => void
}) {
  const activeTenant = useTenant()
  const create = useCreateEnvironment(activeTenant, projectId)
  const [name, setName] = useState("")
  const [copyFromId, setCopyFromId] = useState<number>(envs.find(e => e.is_default)?.id ?? 0)
  const [copyBindings, setCopyBindings] = useState(false)

  const submit = () => {
    if (!name) return toast.error("请输入环境名")
    create.mutate(
      { name, copy_from_env_id: copyFromId || undefined, copy_bindings: copyBindings },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <Card className="p-6 w-[420px] space-y-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold">新增环境</h3>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase">名称</Label>
          <Input
            autoFocus
            placeholder="dev / staging / ..."
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-2xs text-muted-foreground">小写字母/数字/连字符，最长 20</p>
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

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="h-9 text-xs font-bold">取消</Button>
          <Button onClick={submit} className="h-9 text-xs font-bold" disabled={create.isPending}>
            创建
          </Button>
        </div>
      </Card>
    </div>
  )
}
