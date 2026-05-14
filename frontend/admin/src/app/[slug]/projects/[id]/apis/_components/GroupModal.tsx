"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useApiEditorStore } from "../_store/useApiEditorStore"
import { useCreateGroup, useUpdateGroup } from "../_hooks/useGroupsQuery"
import { useTenantProject } from "../_hooks/useTenantProject"

export function GroupModal() {
  const { activeTenant, projectId } = useTenantProject()
  const groupModal = useApiEditorStore(s => s.groupModal)
  const closeGroupModal = useApiEditorStore(s => s.closeGroupModal)
  const setGroupModalName = useApiEditorStore(s => s.setGroupModalName)

  const createGroup = useCreateGroup(activeTenant, projectId)
  const updateGroup = useUpdateGroup(activeTenant, projectId)

  const isPending = createGroup.isPending || updateGroup.isPending

  function handleSubmit() {
    if (!groupModal.name.trim()) return
    if (groupModal.mode === "create") {
      createGroup.mutate(groupModal.name, { onSuccess: closeGroupModal })
    } else if (groupModal.editingGroupId) {
      updateGroup.mutate(
        { id: groupModal.editingGroupId, name: groupModal.name },
        { onSuccess: closeGroupModal },
      )
    }
  }

  return (
    <Dialog open={groupModal.open} onOpenChange={(open) => { if (!open) closeGroupModal() }}>
      <DialogContent className="sm:max-w-[400px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            {groupModal.mode === "create" ? "创建新分组" : "编辑分组"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {groupModal.mode === "create" ? "为 API 接口创建逻辑分组。" : "修改分组名称。"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">分组名称</label>
            <Input
              placeholder="例如：用户中心、订单系统..."
              className="h-9 text-sm rounded-lg"
              value={groupModal.name}
              onChange={(e) => setGroupModalName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={closeGroupModal} className="h-9 px-4 text-xs font-bold">取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="h-9 px-4 text-xs font-bold shadow-sm"
          >
            {groupModal.mode === "create" ? "创建" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
