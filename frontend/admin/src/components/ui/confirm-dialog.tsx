"use client"

import { useConfirmStore } from "@/store/useConfirmStore"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ConfirmDialog() {
  const { open, title, message, accept, reject } = useConfirmStore()

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reject() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-zinc-900">{title}</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 leading-relaxed">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={reject} className="h-9 text-xs font-bold">取消</Button>
          <Button onClick={accept} className="h-9 text-xs font-bold bg-red-600 hover:bg-red-700 text-white">确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
