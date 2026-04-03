"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
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
import { apiListMembers, apiAddMember, apiRemoveMember, apiUpdateMemberRole, type TenantMember } from "@/lib/api-client"
import { Pager } from "@/components/ui/pager"

export default function UsersClientPage() {
  const { activeTenant } = useUIStore()
  const [members, setMembers] = useState<TenantMember[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("Developer")
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [total, setTotal] = useState(0)

  const fetchMembers = async (p?: number, s?: number) => {
    if (!activeTenant) return
    const currentPage = p ?? page
    const currentSize = s ?? size
    try {
      const res = await apiListMembers(activeTenant, currentPage, currentSize)
      setMembers(res.list || [])
      setTotal(res.pagination.total)
      setPage(res.pagination.page)
      setSize(res.pagination.size)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMembers() }, [activeTenant])

  const handleInvite = async () => {
    if (!inviteEmail || !activeTenant) return
    try {
      await apiAddMember(activeTenant, { email: inviteEmail, role: inviteRole as any })
      setInviteEmail("")
      setShowInvite(false)
      fetchMembers()
    } catch (err: any) {
      alert(err?.message || "邀请失败")
    }
  }

  const handleRemove = async (userId: string) => {
    if (!activeTenant || !confirm("确认移除该成员？")) return
    try {
      await apiRemoveMember(activeTenant, userId)
      fetchMembers()
    } catch { /* ignore */ }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    if (!activeTenant) return
    try {
      await apiUpdateMemberRole(activeTenant, userId, role)
      fetchMembers()
    } catch { /* ignore */ }
  }

  const filtered = members.filter(m =>
    (m.user?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.user?.email || "").toLowerCase().includes(search.toLowerCase())
  )

  const roleColor = (role?: string) => {
    if (role === "Admin") return "bg-blue-50 text-blue-600 border-blue-100"
    if (role === "Developer") return "bg-emerald-50 text-emerald-600 border-emerald-100"
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
          onClick={() => setShowInvite(true)}
          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          邀请新成员
        </Button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">邀请成员</h3>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowInvite(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="输入邮箱地址"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 h-9 text-xs"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-9 px-3 text-xs border border-zinc-200 rounded-lg bg-white"
            >
              <option value="Admin">Admin</option>
              <option value="Developer">Developer</option>
              <option value="Viewer">Viewer</option>
            </select>
            <Button onClick={handleInvite} className="h-9 px-4 bg-blue-600 text-white text-xs font-bold">
              发送邀请
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white border border-zinc-200/60 p-3 rounded-xl flex gap-2 shadow-sm">
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

      {/* Member List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-sm text-zinc-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-zinc-400">暂无成员</div>
        ) : (
          filtered.map((m, i) => (
            <motion.div
              key={m.user_id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white border border-zinc-200/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold uppercase border",
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
                    <option value="Developer">Developer</option>
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
            </motion.div>
          ))
        )}
      </div>

      <Pager page={page} size={size} total={total} onChange={(p, s) => fetchMembers(p, s)} />
    </div>
  )
}
