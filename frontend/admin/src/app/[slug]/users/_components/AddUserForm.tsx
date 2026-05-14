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
    <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">添加成员</p>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">邮箱</label>
          <Input
            placeholder="user@company.com"
            value={form.email}
            onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">姓名</label>
          <Input
            placeholder="张三"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">密码</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => onFormChange({ ...form, password: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">角色</label>
          <Select value={form.role} onValueChange={(v) => onFormChange({ ...form, role: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {addError && <p className="text-2xs text-red-500 font-medium">{addError}</p>}

      <div className="flex justify-end">
        <Button onClick={onAdd} disabled={isPending} className="h-8 px-4 text-xs font-bold">
          {isPending ? "添加中..." : "确认添加"}
        </Button>
      </div>
    </div>
  )
}
