"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, FolderGit2, Pencil, Trash2, Search, RefreshCw, CalendarDays } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { Pager } from "@/components/ui/pager"
import { cn } from "@/lib/utils"
import { useTenant } from "@/providers/TenantProvider"
import { useProjects, useDeleteProject, usePaginationState } from "@/hooks"
import type { Project } from "@/lib/api-client"
import { showConfirm } from "@/store/useConfirmStore"

const PROJECT_COLORS = [
  "text-primary border-primary/20 bg-primary/10",
  "text-violet-600 border-violet-200 bg-violet-50",
  "text-emerald-600 border-emerald-200 bg-emerald-50",
  "text-amber-600 border-amber-200 bg-amber-50",
  "text-rose-600 border-rose-200 bg-rose-50",
  "text-indigo-600 border-indigo-200 bg-indigo-50",
]

export default function ProjectsPage() {
  const activeTenant = useTenant()
  const router = useRouter()
  const { page, size, keyword, setPage, setSize, onSearch } = usePaginationState(12)
  const { projects, pagination, isLoading, refetch } = useProjects(activeTenant, { page, size, keyword })
  const deleteMutation = useDeleteProject(activeTenant)

  const handleDelete = async (e: React.MouseEvent, p: Project) => {
    e.preventDefault()
    e.stopPropagation()
    if (!await showConfirm(`确定要删除项目 "${p.name}" 吗？项目下的所有接口也会被删除。`)) return
    deleteMutation.mutate(p.id!)
  }

  const handleEdit = (e: React.MouseEvent, p: Project) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/${activeTenant}/projects/edit/${p.id}`)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">项目</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">管理您的 API 项目，编写 SQL 即可生成 RESTful 接口</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="h-9 px-4 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-zinc-100" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 刷新
          </Button>
          <Link href={`/${activeTenant}/projects/new`}>
            <Button className="h-9 px-4 text-xs font-bold shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> 新建
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-lg p-3 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索项目..." className="pl-9 h-9 text-xs bg-zinc-50 border-border-subtle rounded-lg" value={keyword} onChange={(e) => onSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton count={3} />
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderGit2} title={keyword ? "无匹配项目" : "暂无项目"} description={keyword ? "尝试其他关键词" : "点击「新建」创建第一个项目"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/${activeTenant}/projects/${project.id}/apis`}>
              <Card className="bg-white border-border-subtle rounded-xl shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 flex flex-col h-full overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center border shadow-sm group-hover:scale-105 transition-transform", PROJECT_COLORS[(project.id ?? 0) % PROJECT_COLORS.length])}>
                      <FolderGit2 className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{project.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 min-h-[32px]">{project.description || "暂无描述"}</p>
                </div>
                <div className="mt-auto px-6 py-4 border-t border-border-subtle bg-zinc-50/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-2xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(project.created_at).toLocaleDateString()}</span>
                    {project.slug && <><span className="text-zinc-200">·</span><span className="font-mono">{project.slug}</span></>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button variant="ghost" size="icon-xs" className="rounded-lg hover:bg-primary/10 hover:text-primary" onClick={(e) => handleEdit(e, project)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" className="rounded-lg hover:bg-red-50 hover:text-red-500" onClick={(e) => handleDelete(e, project)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          <Link href={`/${activeTenant}/projects/new`} className="group">
            <div className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center p-6 bg-zinc-50/20 hover:bg-white hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer h-full min-h-[220px]">
              <div className="w-12 h-12 rounded-lg border border-border-subtle flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <Plus className="w-6 h-6 text-zinc-300 group-hover:text-white" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">新建</p>
            </div>
          </Link>
        </div>
      )}

      <Pager page={page} size={size} total={pagination?.total ?? 0} onPageChange={setPage} onSizeChange={setSize} sizeOptions={[12, 24, 48]} />
    </div>
  )
}
