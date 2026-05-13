"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddUserFormValues {
  email: string
  name: string
  password: string
  role: string
}

interface AddUserFormProps {
  form: AddUserFormValues
  addError: string
  isPending: boolean
  onFormChange: (form: AddUserFormValues) => void
  onAdd: () => void
  onClose: () => void
}

export function AddUserForm({ form, addError, isPending, onFormChange, onAdd, onClose }: AddUserFormProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-900">添加成员</h3>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">邮箱</label>
          <Input
            placeholder="user@company.com"
            value={form.email}
            onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">姓名</label>
          <Input
            placeholder="张三"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">密码</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => onFormChange({ ...form, password: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">角色</label>
          <Select value={form.role} onValueChange={(v) => onFormChange({ ...form, role: v })}>
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
        <Button onClick={onAdd} disabled={isPending} className="h-9 px-6 bg-blue-600 text-white text-xs font-bold">
          {isPending ? "添加中..." : "确认添加"}
        </Button>
      </div>
    </div>
  )
}
