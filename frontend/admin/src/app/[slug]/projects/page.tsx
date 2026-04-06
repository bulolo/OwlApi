"use client"

import { useState } from "react"
import { useUIStore } from "@/store/useUIStore"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, FolderGit2, Database, Pencil, Trash2, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useProjects, useDeleteProject } from "@/hooks"
import type { Project } from "@/lib/api-client"
import { CardSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { Pager } from "@/components/ui/pager"

export default function ProjectsPage() {
  const { activeTenant } = useUIStore()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState("")
  const { projects, pagination, isLoading } = useProjects(activeTenant, { page, size: 12, keyword })
  const deleteMutation = useDeleteProject(activeTenant)

  const handleDelete = async (e: React.MouseEvent, p: Project) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`确定要删除项目 "${p.name}" 吗？项目下的所有接口也会被删除。`)) return
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
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">项目</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">管理您的 API 项目，编写 SQL 即可生成 RESTful 接口</p>
        </div>
        <Link href={`/${activeTenant}/projects/new`}>
          <Button className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" /> 创建项目
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-zinc-100 rounded-lg p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="搜索项目..." className="pl-9 h-9 text-xs bg-zinc-50 border-zinc-100 rounded-lg" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1) }} />
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton count={3} />
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderGit2} title={keyword ? "无匹配项目" : "暂无项目"} description={keyword ? "尝试其他关键词" : "点击「创建项目」开始"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/${activeTenant}/projects/${project.id}/apis`}>
              <Card className="bg-white border-zinc-100 rounded-lg shadow-sm hover:shadow-md hover:border-blue-600/30 transition-all duration-300 flex flex-col h-full overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center border shadow-sm text-blue-600 border-blue-100 bg-blue-50/30 group-hover:scale-105 transition-transform">
                      <FolderGit2 className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1.5">
                      <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight bg-zinc-50 text-zinc-500 border-zinc-100">
                        Project
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight">{project.name}</h3>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1.5 min-h-[32px]">{project.description || "暂无描述"}</p>
                </div>
                <div className="mt-auto px-6 py-4 border-t border-zinc-100 bg-zinc-50/10 flex items-center justify-between">
                  <div className="flex items-center text-[10px] font-bold text-zinc-500">
                    <Database className="w-3.5 h-3.5 mr-2 text-blue-500" /> SQL to API
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600" onClick={(e) => handleEdit(e, project)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500" onClick={(e) => handleDelete(e, project)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          <Link href={`/${activeTenant}/projects/new`} className="group">
            <div className="border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center p-6 bg-zinc-50/20 hover:bg-white hover:border-blue-600/30 hover:shadow-sm transition-all cursor-pointer h-full min-h-[220px]">
              <div className="w-12 h-12 rounded-lg border border-zinc-100 flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                <Plus className="w-6 h-6 text-zinc-300 group-hover:text-white" />
              </div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide">创建项目</p>
            </div>
          </Link>
        </div>
      )}

      <Pager page={page} size={12} total={pagination?.total ?? 0} onPageChange={setPage} />
    </div>
  )
}
