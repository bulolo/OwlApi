"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Database } from "lucide-react"
import Link from "next/link"
import { useUIStore } from "@/store/useUIStore"
import { apiCreateProject, apiUpdateProject, apiGetProject, apiListDataSources, type DataSource } from "@/lib/api-client"

export default function ProjectFormPage({ projectId }: { projectId?: number }) {
  const { activeTenant } = useUIStore()
  const router = useRouter()
  const isEdit = !!projectId
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({ name: "", description: "", datasource_id: 0 })

  useEffect(() => {
    if (activeTenant) {
      apiListDataSources(activeTenant).then(data => setDataSources(data.list || [])).catch(() => {})
    }
  }, [activeTenant])

  useEffect(() => {
    if (isEdit && activeTenant) {
      apiGetProject(activeTenant, projectId).then(p => {
        setFormData({ name: p.name, description: p.description, datasource_id: p.datasource_id })
      }).catch(() => {})
    }
  }, [projectId, activeTenant])

  useEffect(() => {
    if (!isEdit && dataSources.length > 0 && !formData.datasource_id) {
      setFormData(prev => ({ ...prev, datasource_id: dataSources[0].id }))
    }
  }, [dataSources])

  const handleSave = async () => {
    if (!formData.name) return alert("请输入项目名称")
    if (!formData.datasource_id) return alert("请选择数据源")
    try {
      setSaving(true)
      if (isEdit) {
        await apiUpdateProject(activeTenant, projectId, formData)
      } else {
        await apiCreateProject(activeTenant, formData)
      }
      router.push(`/${activeTenant}/projects`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
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
            <p className="text-sm text-zinc-500 mt-0.5">{isEdit ? "修改项目配置" : "创建一个新的 API 项目，绑定数据源后即可开始编写接口。"}</p>
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

      <Card className="p-8 border-zinc-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 uppercase">项目名称</Label>
          <Input placeholder="例如：电商核心业务" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-10 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 uppercase">项目描述</Label>
          <Textarea placeholder="简述该项目的主要功能" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[80px] text-sm resize-none" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 uppercase">绑定数据源</Label>
          <Select value={String(formData.datasource_id)} onValueChange={(v) => setFormData({ ...formData, datasource_id: Number(v) })}>
            <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="选择数据源..." /></SelectTrigger>
            <SelectContent>
              {dataSources.map(ds => (
                <SelectItem key={ds.id} value={String(ds.id)}>
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-bold">{ds.name}</span>
                    <span className="text-[10px] text-zinc-400 uppercase">{ds.type}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
    </div>
  )
}
