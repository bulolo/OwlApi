"use client"

import { useState, useEffect } from "react"

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
import { apiListUsers, apiAddUser, apiRemoveUser, apiUpdateUserRole, type TenantUser } from "@/lib/api-client"
import { Pager } from "@/components/ui/pager"

export default function UsersClientPage() {
  const { activeTenant } = useUIStore()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "Viewer" })
  const [addError, setAddError] = useState("")
  const [adding, setAdding] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [total, setTotal] = useState(0)

  const fetchUsers = async (p?: number, s?: number) => {
    if (!activeTenant) return
    const currentPage = p ?? page
    const currentSize = s ?? size
    try {
      const res = await apiListUsers(activeTenant, currentPage, currentSize)
      setUsers(res.list || [])
      setTotal(res.pagination.total)
      setPage(res.pagination.page)
      setSize(res.pagination.size)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [activeTenant])

  const handleAdd = async () => {
    if (!form.email || !form.name || !form.password || !activeTenant) return
    setAdding(true)
    setAddError("")
    try {
      await apiAddUser(activeTenant, { ...form, role: form.role as any })
      setForm({ email: "", name: "", password: "", role: "Viewer" })
      setShowAdd(false)
      fetchUsers()
    } catch (err: any) {
      setAddError(err?.message || "添加失败")
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (userId: number) => {
    if (!activeTenant || !confirm("确认移除该成员？")) return
    try {
      await apiRemoveUser(activeTenant, userId)
      fetchUsers()
    } catch { /* ignore */ }
  }

  const handleRoleChange = async (userId: number, role: string) => {
    if (!activeTenant) return
    try {
      await apiUpdateUserRole(activeTenant, userId, role)
      fetchUsers()
    } catch { /* ignore */ }
  }

  const filtered = users.filter(m =>
    (m.user?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.user?.email || "").toLowerCase().includes(search.toLowerCase())
  )

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
              <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full h-9 px-3 text-xs border border-zinc-200 rounded-lg bg-white">
                <option value="Admin">Admin</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={adding} className="h-9 px-6 bg-blue-600 text-white text-xs font-bold">
              {adding ? "添加中..." : "确认添加"}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-sm text-zinc-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-zinc-400">暂无成员</div>
        ) : (
          filtered.map((m, i) => (
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
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.user_id!, e.target.value)}
                    className={cn(
                      "h-7 px-2 text-[10px] font-bold uppercase border rounded-full appearance-none cursor-pointer",
                      roleColor(m.role)
                    )}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Viewer">Viewer</option>
                  </select>
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

      <Pager page={page} size={size} total={total} onChange={(p, s) => fetchUsers(p, s)} />
    </div>
  )
}
