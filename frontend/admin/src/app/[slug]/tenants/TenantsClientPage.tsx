"use client"

import { useState } from "react"
import { 
  Building2, Plus, Search, Shield, Activity, Clock,
  ChevronRight, Trash2, Globe, Pencil, X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useUIStore } from "@/store/useUIStore"
import { useRouter } from "next/navigation"
import { useTenants } from "@/hooks"
import { apiDeleteTenant, apiUpdateTenant, type Tenant } from "@/lib/api-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pager } from "@/components/ui/pager"
import { toast } from "sonner"
import { ListSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { useQueryClient } from "@tanstack/react-query"

import TenantRegisterForm from "./TenantRegisterForm"

export default function TenantsClientPage() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [page, setPage] = useState(1)
  const { setViewContext, setActiveTenant } = useUIStore()
  const { tenants, pagination, isLoading } = useTenants({ page, size: 20, keyword })
  const qc = useQueryClient()
  const router = useRouter()

  if (isRegistering) {
    return <TenantRegisterForm onCancel={() => setIsRegistering(false)} onSuccess={() => { setIsRegistering(false); qc.invalidateQueries({ queryKey: ["tenants"] }) }} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-zinc-400" />
            租户管理
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">查看并管理所有企业租户、订阅状态及资源使用情况。</p>
        </div>
        <Button 
          onClick={() => setIsRegistering(true)}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          开通新租户
        </Button>
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditTenantModal
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["tenants"] }) }}
        />
      )}

      {/* List */}
      <div className="bg-white rounded-lg border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="搜索租户名称、Slug 或 ID..." 
              className="pl-9 h-9 text-xs border-zinc-200 bg-white"
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setKeyword(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {tenants.map((tenant, i) => (
            <div 
              key={tenant.id}
              className="p-4 hover:bg-zinc-50/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200 group-hover:bg-white transition-colors">
                     <Building2 className="w-5 h-5 text-zinc-400 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-900">{tenant.name}</h3>
                      <Badge variant="secondary" className="text-[10px] h-4 font-black uppercase tracking-tighter bg-zinc-100 text-zinc-500">
                        {tenant.id}
                      </Badge>
                      <Badge className={cn(
                        "text-[10px] h-4 font-black uppercase",
                        tenant.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {tenant.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" /> owlapi.cn/{tenant.slug}
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
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">计划</p>
                    <p className="text-xs font-bold text-zinc-700">{tenant.plan || 'Free'}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="h-8 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      setViewContext('TENANT');
                      setActiveTenant(tenant.slug!);
                      // markTenantAsRecent removed — using React Query now
                      router.push(`/${tenant.slug}/overview`);
                    }}
                  >
                    进入管理
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => setEditing(tenant)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={async () => {
                      if (!confirm(`确认删除租户「${tenant.name}」？此操作不可恢复。`)) return
                      try { 
                        await apiDeleteTenant(tenant.slug!)
                        toast.success(`租户「${tenant.name}」已删除`)
                        qc.invalidateQueries({ queryKey: ["tenants"] }) 
                      } catch (err: any) {
                        toast.error(err.message || "删除失败")
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {tenants.length === 0 && (
            <div className="p-12 text-center text-sm text-zinc-400">暂无租户</div>
          )}
        </div>
        
        <Pager page={page} size={20} total={pagination?.total ?? 0} onPageChange={setPage} />
      </div>
    </div>
  )
}

// ---- Edit Tenant Modal ----

function EditTenantModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tenant.name || "")
  const [plan, setPlan] = useState(tenant.plan || "Free")
  const [status, setStatus] = useState(tenant.status || "Active")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      await apiUpdateTenant(tenant.slug!, { name, plan, status })
      onSaved()
    } catch (err: any) {
      setError(err?.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-900">编辑租户 — {tenant.slug}</h3>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">租户名称</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">订阅计划</label>
          <Select value={plan} onValueChange={v => setPlan(v as typeof plan)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">状态</label>
          <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} className="h-9 text-xs font-bold">取消</Button>
        <Button onClick={handleSave} disabled={saving} className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
