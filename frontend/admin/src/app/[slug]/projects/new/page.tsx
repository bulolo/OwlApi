"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { useTenant } from "@/providers/TenantProvider"
import { useProject, useCreateProject, useUpdateProject, useDataSources } from "@/hooks"
import { ENV_PRESETS } from "../_utils/envPresets"
import type { ProjectResp as Project } from "@/lib/sdk"
import { toast } from "sonner"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== "undefined" ? window.location.origin : "")

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
}

function ProjectForm({
  slug,
  projectId,
  existing,
}: {
  slug: string
  projectId?: number
  existing?: Project
}) {
  const router = useRouter()
  const isEdit = !!projectId
  const createMutation = useCreateProject(slug)
  const updateMutation = useUpdateProject(slug, projectId ?? 0)
  const { dataSources } = useDataSources(slug, { size: 100 })

  const [formData, setFormData] = useState(() => ({
    slug: existing?.slug ?? "",
    name: existing?.name ?? "",
    description: existing?.description ?? "",
  }))
  const [env, setEnv] = useState("prod") // 初始环境（仅创建时使用）
  const [datasourceId, setDatasourceId] = useState(0) // 初始环境 main 别名绑定的数据源，0=暂不绑定
  const [slugEdited, setSlugEdited] = useState(!!existing)

  const saving = createMutation.isPending || updateMutation.isPending

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: slugEdited ? prev.slug : toSlug(name),
    }))
  }

  const handleSlugChange = (value: string) => {
    setSlugEdited(true)
    setFormData(prev => ({ ...prev, slug: value }))
  }

  const handleSave = () => {
    if (!formData.name) return toast.error("请输入项目名称")
    if (!formData.slug) return toast.error("请输入项目 Slug")
    const onSuccess = () => router.push(`/${slug}/projects`)
    if (isEdit) {
      updateMutation.mutate({ name: formData.name, description: formData.description }, { onSuccess })
    } else {
      createMutation.mutate({ ...formData, env, datasource_id: datasourceId || undefined }, { onSuccess })
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/${slug}/projects`}>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{isEdit ? "编辑项目" : "创建项目"}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{isEdit ? "修改项目配置" : "创建一个新的 API 项目，即可开始编写 SQL 接口。"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-9 px-4 text-xs font-bold text-zinc-600">取消</Button>
          <Button onClick={handleSave} disabled={saving} className="h-9 px-4 text-xs font-bold shadow-sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "保存中..." : isEdit ? "保存修改" : "创建项目"}
          </Button>
        </div>
      </div>

      <Card className="p-8 border-border-subtle shadow-card space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase">项目名称 <span className="text-red-500">*</span></Label>
          <Input placeholder="例如：电商核心业务" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} className="h-9 text-sm" required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase">项目 Slug <span className="text-red-500">*</span></Label>
          <Input
            placeholder="例如：ecommerce"
            value={formData.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="h-9 text-sm font-mono"
            required
          />
          <p className="text-xs text-muted-foreground">用于接口 URL 路径，仅支持小写字母、数字和连字符。发布后的访问地址：<code className="bg-zinc-100 px-1 rounded text-zinc-600">{API_BASE}/{slug}/{formData.slug || "project-slug"}/&#123;path&#125;</code></p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase">项目描述</Label>
          <Textarea placeholder="简述该项目的主要功能" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[80px] text-sm resize-none" />
        </div>
        {!isEdit && (
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">初始环境 <span className="text-red-500">*</span></Label>
              <Select value={env} onValueChange={setEnv}>
                <SelectTrigger className="h-9 text-sm w-[220px]">
                  <SelectValue placeholder="选择环境..." />
                </SelectTrigger>
                <SelectContent>
                  {ENV_PRESETS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">项目的默认环境，创建时一并建好；其它环境可在「环境管理」添加。提示：<code className="bg-zinc-100 px-1 rounded text-zinc-600">prod</code> 对应 SDK 发布的 GitLab <code className="bg-zinc-100 px-1 rounded text-zinc-600">main</code> 分支（稳定版）；其它环境发的是预发布版。</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">数据源（别名 <code className="bg-zinc-100 px-1 rounded text-zinc-600 normal-case">main</code>）</Label>
              {dataSources.length === 0 ? (
                <p className="text-xs text-muted-foreground">当前还没有数据源，可创建项目后到「环境管理」为 <code className="bg-zinc-100 px-1 rounded text-zinc-600">main</code> 别名绑定数据源。</p>
              ) : (
                <>
                  <Select value={datasourceId ? String(datasourceId) : "0"} onValueChange={(v) => setDatasourceId(Number(v))}>
                    <SelectTrigger className="h-9 text-sm w-[280px]">
                      <SelectValue placeholder="选择数据源..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">暂不绑定（稍后在环境管理配置）</SelectItem>
                      {dataSources.map(ds => (
                        <SelectItem key={ds.id} value={String(ds.id)}>
                          <span className="font-bold">{ds.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{ds.type}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">为 prod 环境的 <code className="bg-zinc-100 px-1 rounded text-zinc-600">main</code> 别名绑定数据源，接口即刻可调用；接口默认通过 <code className="bg-zinc-100 px-1 rounded text-zinc-600">main</code> 引用数据源。</p>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function ProjectFormPage({ projectId }: { projectId?: number }) {
  const activeTenant = useTenant()
  const { data: existing, isLoading } = useProject(activeTenant, projectId ?? 0)

  if (projectId && isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 flex items-center justify-center min-h-[300px]">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ProjectForm
      key={projectId ?? "new"}
      slug={activeTenant}
      projectId={projectId}
      existing={existing}
    />
  )
}
