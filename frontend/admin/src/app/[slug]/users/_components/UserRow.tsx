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
  }
}

interface UserRowProps {
  member: UserMember
  roleColor: (role?: string) => string
  onRoleChange: (userId: number, role: "Admin" | "Viewer") => void
  onRemove: (userId: number) => void
}

export function UserRow({ member: m, roleColor, onRoleChange, onRemove }: UserRowProps) {
  return (
    <div className="bg-white border border-zinc-100 rounded-lg p-4 shadow-sm hover:shadow-sm transition-all group">
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
            <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3" />
              {m.user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={m.role} onValueChange={(v) => onRoleChange(m.user_id!, v as "Admin" | "Viewer")}>
            <SelectTrigger className={cn("h-7 w-24 text-[10px] font-bold uppercase rounded-full border", roleColor(m.role))}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            onClick={() => onRemove(m.user_id!)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
