"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useEndpointStore } from "../_store/useEndpointStore"
import { useTenantProject } from "../_hooks/useTenantProject"

export function GroupModal() {
  const { activeTenant, projectId } = useTenantProject()
  const groupModal = useEndpointStore(s => s.groupModal)
  const closeGroupModal = useEndpointStore(s => s.closeGroupModal)
  const setGroupModalName = useEndpointStore(s => s.setGroupModalName)
  const submitGroupModal = useEndpointStore(s => s.submitGroupModal)

  return (
    <Dialog open={groupModal.open} onOpenChange={(open) => { if (!open) closeGroupModal() }}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-900">
            {groupModal.mode === "create" ? "创建新分组" : "编辑分组"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {groupModal.mode === "create" ? "为 API 接口创建逻辑分组。" : "修改分组名称。"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">分组名称</label>
            <Input
              placeholder="例如：用户中心、订单系统..."
              className="h-9 text-sm rounded-lg"
              value={groupModal.name}
              onChange={(e) => setGroupModalName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitGroupModal(activeTenant, projectId)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={closeGroupModal} className="h-9 text-xs font-bold rounded-lg">取消</Button>
          <Button
            onClick={() => submitGroupModal(activeTenant, projectId)}
            className="h-9 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/15"
          >
            {groupModal.mode === "create" ? "创建" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
