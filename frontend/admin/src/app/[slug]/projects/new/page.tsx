"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { useUIStore } from "@/store/useUIStore"
import { useProject, useCreateProject, useUpdateProject } from "@/hooks"
import { toast } from "sonner"

export default function ProjectFormPage({ projectId }: { projectId?: number }) {
  const { activeTenant } = useUIStore()
  const router = useRouter()
  const isEdit = !!projectId

  const { data: existing } = useProject(activeTenant, projectId ?? 0)
  const createMutation = useCreateProject(activeTenant)
  const updateMutation = useUpdateProject(activeTenant, projectId ?? 0)

  const [formData, setFormData] = useState({ name: "", description: "" })

  useEffect(() => {
    if (existing) setFormData({ name: existing.name ?? "", description: existing.description ?? "" })
  }, [existing])

  const saving = createMutation.isPending || updateMutation.isPending

  const handleSave = () => {
    if (!formData.name) return toast.error("请输入项目名称")
    const onSuccess = () => router.push(`/${activeTenant}/projects`)
    if (isEdit) {
      updateMutation.mutate(formData, { onSuccess })
    } else {
      createMutation.mutate(formData, { onSuccess })
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/${activeTenant}/projects`}>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{isEdit ? "编辑项目" : "创建项目"}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{isEdit ? "修改项目配置" : "创建一个新的 API 项目，即可开始编写 SQL 接口。"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-10 px-6 font-bold text-zinc-600">取消</Button>
          <Button onClick={handleSave} disabled={saving} className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "保存中..." : isEdit ? "保存修改" : "创建项目"}
          </Button>
        </div>
      </div>

      <Card className="p-8 border-zinc-100 shadow-sm space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 uppercase">项目名称</Label>
          <Input placeholder="例如：电商核心业务" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-10 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 uppercase">项目描述</Label>
          <Textarea placeholder="简述该项目的主要功能" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[80px] text-sm resize-none" />
        </div>
      </Card>
    </div>
  )
}
