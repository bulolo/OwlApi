"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import SettingsClientPage from "@/app/[slug]/settings/SettingsClientPage"

interface TenantSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function TenantSettingsModal({ open, onOpenChange }: TenantSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-lg">
        <DialogTitle className="sr-only">系统设置</DialogTitle>
        <div className="flex-1 overflow-y-auto p-8">
          <SettingsClientPage />
        </div>
      </DialogContent>
    </Dialog>
  )
}
