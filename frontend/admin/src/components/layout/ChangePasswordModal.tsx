"use client"

import { useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, Eye, EyeOff, Shield, X } from "lucide-react"
import { apiChangePassword } from "@/lib/api-client"

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  const reset = () => {
    setOldPassword(""); setNewPassword(""); setConfirmPassword("")
    setError(""); setShowOld(false); setShowNew(false); setShowConfirm(false)
  }

  const handleClose = () => { reset(); onOpenChange(false) }

  const handleSubmit = async () => {
    setError("")
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("请填写所有字段"); return
    }
    if (newPassword.length < 6) {
      setError("新密码至少 6 位"); return
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致"); return
    }
    if (oldPassword === newPassword) {
      setError("新密码不能与当前密码相同"); return
    }
    setIsPending(true)
    try {
      await apiChangePassword({ old_password: oldPassword, new_password: newPassword })
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "修改失败，请稍后重试")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-white rounded-2xl shadow-modal p-0 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">修改密码</DialogPrimitive.Title>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">修改密码</h2>
                <p className="text-2xs text-muted-foreground mt-0.5">更新你的登录凭据</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <PasswordField
              id="old-pw" label="当前密码" placeholder="输入当前密码"
              value={oldPassword} onChange={setOldPassword}
              show={showOld} onToggle={() => setShowOld(!showOld)}
            />
            <PasswordField
              id="new-pw" label="新密码" placeholder="至少 6 位"
              value={newPassword} onChange={setNewPassword}
              show={showNew} onToggle={() => setShowNew(!showNew)}
            />
            <PasswordField
              id="confirm-pw" label="确认新密码" placeholder="再次输入新密码"
              value={confirmPassword} onChange={setConfirmPassword}
              show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)}
            />

            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}

            <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/10 rounded-xl p-3">
              <Shield className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-2xs text-muted-foreground leading-relaxed">
                修改密码后，其他设备上的登录状态不会立即失效，建议在敏感操作后手动退出。
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2.5 px-6 pb-5">
            <Button variant="outline" className="flex-1" onClick={handleClose}>取消</Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isPending || !oldPassword || !newPassword || !confirmPassword}
            >
              {isPending ? "更新中..." : "确认修改"}
            </Button>
          </div>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function PasswordField({
  id, label, placeholder, value, onChange, show, onToggle,
}: {
  id: string; label: string; placeholder: string
  value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10 h-9 text-sm"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-muted-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
