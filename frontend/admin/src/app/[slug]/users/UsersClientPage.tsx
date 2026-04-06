"use client"

import { useState } from "react"

import {
  Users,
  Plus,
  Search,
  Mail,
  Filter,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/useUIStore"
import { useUsers, useAddUser, useRemoveUser, useUpdateUserRole } from "@/hooks"
import type { TenantUser } from "@/lib/api-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pager } from "@/components/ui/pager"
import { ListSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"

export default function UsersClientPage() {
  const { activeTenant } = useUIStore()
  const [keyword, setKeyword] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "Viewer" })
  const [addError, setAddError] = useState("")
  const [page, setPage] = useState(1)

  const { users, pagination, isLoading } = useUsers(activeTenant, { page, size: 10, keyword })

  const addMutation = useAddUser(activeTenant)
  const removeMutation = useRemoveUser(activeTenant)
  const roleMutation = useUpdateUserRole(activeTenant)

  const handleAdd = async () => {
    if (!form.email || !form.name || !form.password || !activeTenant) return
    setAddError("")
    addMutation.mutate(
      { email: form.email, name: form.name, password: form.password, role: form.role as 'Admin' | 'Viewer' },
      {
        onSuccess: () => { setForm({ email: "", name: "", password: "", role: "Viewer" }); setShowAdd(false) },
        onError: (err) => setAddError(err.message || "添加失败"),
      },
    )
  }

  const handleRemove = (userId: number) => {
    if (!confirm("确认移除该成员？")) return
    removeMutation.mutate(userId)
  }

  const handleRoleChange = (userId: number, role: 'Admin' | 'Viewer') => {
    roleMutation.mutate({ userId, role })
  }

  const roleColor = (role?: string) => {
    if (role === "Admin") return "bg-blue-50 text-blue-600 border-blue-100"
    return "bg-zinc-50 text-zinc-500 border-zinc-200"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">成员管理</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">管理当前租户的成员及角色</p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加成员
        </Button>
      </div>

      {/* Add User Form */}
      {showAdd && (
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">添加成员</h3>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setShowAdd(false); setAddError("") }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">邮箱</label>
              <Input placeholder="user@company.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">姓名</label>
              <Input placeholder="张三" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">密码</label>
              <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">角色</label>
              <Select value={form.role} onValueChange={(v) => setForm({...form, role: v})}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={addMutation.isPending} className="h-9 px-6 bg-blue-600 text-white text-xs font-bold">
              {addMutation.isPending ? "添加中..." : "确认添加"}
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white border border-zinc-100 p-3 rounded-lg flex gap-2 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索姓名或邮箱..."
            className="pl-9 h-9 text-xs bg-zinc-50 border-zinc-100 rounded-lg"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="暂无成员" description="添加第一个团队成员" />
        ) : (
          users.map((m, i) => (
            <div
              key={m.user_id}
              className="bg-white border border-zinc-100 rounded-lg p-4 shadow-sm hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold uppercase border",
                    roleColor(m.role)
                  )}>
                    {(m.user?.name || "?").charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">{m.user?.name}</h4>
                    <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {m.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={m.role} onValueChange={(v) => handleRoleChange(m.user_id!, v as 'Admin' | 'Viewer')}>
                    <SelectTrigger className={cn("h-7 w-24 text-[10px] font-bold uppercase rounded-full border", roleColor(m.role))}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => handleRemove(m.user_id!)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Pager page={page} size={10} total={pagination?.total ?? 0} onPageChange={setPage} />
    </div>
  )
}
