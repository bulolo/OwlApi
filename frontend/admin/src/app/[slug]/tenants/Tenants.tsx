"use client"

import { useState } from "react"
import {
  Building2, Plus, Search, Clock,
  ChevronRight, Trash2, Globe, Pencil, X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useUIStore } from "@/store/useUIStore"
import { useRouter } from "next/navigation"
import { useTenants, usePaginationState, useAdminMutation } from "@/hooks"
import { apiDeleteTenant, apiUpdateTenant, type Tenant } from "@/lib/api-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pager } from "@/components/ui/pager"
import { showConfirm } from "@/store/useConfirmStore"
import { useIsClient } from "@/hooks/useIsClient"

import TenantRegisterForm from "./_components/TenantRegisterForm"

export default function Tenants({ onClose }: { onClose?: () => void }) {
  const isClient = useIsClient()
  const appHost = isClient ? window.location.host : ''
  const [isRegistering, setIsRegistering] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const { page, size, keyword, setPage, setSize, onSearch } = usePaginationState(20)
  const { setViewContext } = useUIStore()
  const { tenants, pagination } = useTenants({ page, size, keyword })
  const router = useRouter()

  const deleteMutation = useAdminMutation({
    mutationFn: (tenant: Tenant) => apiDeleteTenant(tenant.slug!),
    invalidateKeys: [["tenants"]],
    successMsg: (_, tenant) => `组织「${tenant.name}」已删除`,
    errorMsg: "删除失败",
  })

  const handleDelete = async (tenant: Tenant) => {
    if (!await showConfirm(`确认删除组织「${tenant.name}」？此操作不可恢复。`)) return
    deleteMutation.mutate(tenant)
  }

  if (isRegistering) {
    return (
      <TenantRegisterForm
        onCancel={() => setIsRegistering(false)}
        onSuccess={() => setIsRegistering(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">组织管理</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">查看并管理所有企业组织、订阅状态及资源使用情况。</p>
        </div>
        <Button
          onClick={() => setIsRegistering(true)}
          className="h-9 px-4 text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          开通新组织
        </Button>
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditTenantModal
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {/* List */}
      <div className="bg-white rounded-lg border border-border-subtle shadow-card overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-zinc-50/30">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索组织名称、Slug 或 ID..."
              className="pl-9 h-9 text-xs border-border bg-white"
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="p-4 hover:bg-zinc-50/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center border border-border group-hover:bg-white transition-colors">
                     <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{tenant.name}</h3>
                      <Badge variant="secondary" className="text-2xs h-4 font-black uppercase tracking-tight bg-zinc-100 text-muted-foreground">
                        {tenant.id}
                      </Badge>
                      <Badge className={cn(
                        "text-2xs h-4 font-black",
                        tenant.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-500 border-red-100"
                      )}>
                        {{ Active: '正常', Suspended: '已停用' }[tenant.status!] ?? tenant.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {appHost}/{tenant.slug}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-200" />
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden md:block text-right mr-6">
                    <p className="text-2xs font-black text-muted-foreground uppercase tracking-widest mb-0.5">计划</p>
                    <p className={cn("text-xs font-bold", tenant.plan === 'Demo' ? "text-orange-500" : "text-foreground")}>{tenant.plan || 'Free'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-8 text-xs font-bold text-primary hover:text-primary/90 hover:bg-primary/10"
                    onClick={() => {
                      onClose?.()
                      setViewContext('TENANT');
                      router.push(`/${tenant.slug}/overview`);
                    }}
                  >
                    进入管理
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => setEditing(tenant)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(tenant)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {tenants.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">暂无组织</div>
          )}
        </div>

        <Pager page={page} size={size} total={pagination?.total ?? 0} onPageChange={setPage} onSizeChange={setSize} />
      </div>
    </div>
  )
}

// ---- Edit Tenant Modal ----

function EditTenantModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tenant.name || "")
  const [plan, setPlan] = useState(tenant.plan || "Free")
  const [status, setStatus] = useState(tenant.status || "Active")
  const [error, setError] = useState("")

  const updateMutation = useAdminMutation({
    mutationFn: () => apiUpdateTenant(tenant.slug!, { name, plan, status }),
    invalidateKeys: [["tenants"]],
    onSuccess: () => onSaved(),
    errorMsg: (err) => (err as Error)?.message || "保存失败",
  })

  const handleSaveTenant = () => {
    setError("")
    updateMutation.mutate(undefined)
  }

  return (
    <div className="bg-white border border-border rounded-lg p-6 shadow-card space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">编辑组织 — {tenant.slug}</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-2xs font-bold text-muted-foreground uppercase tracking-widest">组织名称</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1.5">
          <label className="text-2xs font-bold text-muted-foreground uppercase tracking-widest">订阅计划</label>
          <Select value={plan} onValueChange={v => setPlan(v as typeof plan)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Demo">Demo</SelectItem>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-2xs font-bold text-muted-foreground uppercase tracking-widest">状态</label>
          <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">正常</SelectItem>
              <SelectItem value="Suspended">已停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} className="h-9 px-4 text-xs font-bold">取消</Button>
        <Button onClick={handleSaveTenant} disabled={updateMutation.isPending} className="h-9 px-4 text-xs font-bold shadow-sm">
          {updateMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
