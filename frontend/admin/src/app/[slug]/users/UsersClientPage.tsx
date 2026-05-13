"use client"

import { useState } from "react"
import { Users, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTenant } from "@/providers/TenantProvider"
import { useUsers, useAddUser, useRemoveUser, useUpdateUserRole } from "@/hooks"
import { Pager } from "@/components/ui/pager"
import { ListSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { showConfirm } from "@/store/useConfirmStore"
import { AddUserForm } from "./_components/AddUserForm"
import { UserRow } from "./_components/UserRow"

export default function UsersClientPage() {
  const activeTenant = useTenant()
  const [keyword, setKeyword] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "Viewer" })
  const [addError, setAddError] = useState("")
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  const { users, pagination, isLoading } = useUsers(activeTenant, { page, size, keyword })

  const addMutation = useAddUser(activeTenant)
  const removeMutation = useRemoveUser(activeTenant)
  const roleMutation = useUpdateUserRole(activeTenant)

  const handleAdd = async () => {
    if (!form.email || !form.name || !form.password || !activeTenant) return
    setAddError("")
    addMutation.mutate(
      { email: form.email, name: form.name, password: form.password, role: form.role as "Admin" | "Viewer" },
      {
        onSuccess: () => { setForm({ email: "", name: "", password: "", role: "Viewer" }); setShowAdd(false) },
        onError: (err) => setAddError(err.message || "添加失败"),
      },
    )
  }

  const handleRemove = async (userId: number) => {
    if (!await showConfirm("确认移除该成员？")) return
    removeMutation.mutate(userId)
  }

  const handleRoleChange = (userId: number, role: "Admin" | "Viewer") => {
    roleMutation.mutate({ userId, role })
  }

  const roleColor = (role?: string) => {
    if (role === "Admin") return "bg-blue-50 text-blue-600 border-blue-100"
    return "bg-zinc-50 text-zinc-500 border-zinc-200"
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">成员管理</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">管理当前组织的成员及角色</p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加成员
        </Button>
      </div>

      {showAdd && (
        <AddUserForm
          form={form}
          addError={addError}
          isPending={addMutation.isPending}
          onFormChange={setForm}
          onAdd={handleAdd}
          onClose={() => { setShowAdd(false); setAddError("") }}
        />
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
          users.map((m) => (
            <UserRow
              key={m.user_id}
              member={m}
              roleColor={roleColor}
              onRoleChange={handleRoleChange}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      <Pager page={page} size={size} total={pagination?.total ?? 0} onPageChange={setPage} onSizeChange={setSize} />
    </div>
  )
}
