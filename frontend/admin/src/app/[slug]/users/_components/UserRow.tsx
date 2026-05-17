"use client"

import { Mail, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface UserMember {
  user_id?: number
  role?: string
  user?: {
    name?: string
    email?: string
    is_superadmin?: boolean
  }
}

interface UserRowProps {
  member: UserMember
  roleColor: (role?: string) => string
  onRoleChange: (userId: number, role: "Admin" | "Viewer") => void
  onRemove: (userId: number) => void
}

export function UserRow({ member: m, roleColor, onRoleChange, onRemove }: UserRowProps) {
  const initials = (m.user?.name || "?").slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border-subtle bg-white hover:border-border hover:bg-zinc-50/40 transition-colors group">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase shrink-0 border",
          roleColor(m.role)
        )}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{m.user?.name}</p>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5 truncate">
            <Mail className="w-3 h-3 shrink-0" />
            {m.user?.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        <Select value={m.role} onValueChange={(v) => onRoleChange(m.user_id!, v as "Admin" | "Viewer")}>
          <SelectTrigger className={cn(
            "h-6 w-20 text-2xs font-bold uppercase rounded-full border px-2.5",
            roleColor(m.role)
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Admin">管理员</SelectItem>
            <SelectItem value="Viewer">访客</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
          onClick={() => onRemove(m.user_id!)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
