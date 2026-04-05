"use client"

import { useEffect, useState } from "react"
import { useUIStore } from "@/store/useUIStore"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FolderGit2, Database, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiListProjects, apiDeleteProject, type Project } from "@/lib/api-client"

export default function ProjectsPage() {
  const { activeTenant } = useUIStore()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    if (!activeTenant) return
    try {
      setLoading(true)
      const data = await apiListProjects(activeTenant)
      setProjects(data.list || [])
    } catch (err) {
      console.error("Failed to fetch projects", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [activeTenant])

  const handleDelete = async (e: React.MouseEvent, p: Project) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`确定要删除项目 "${p.name}" 吗？项目下的所有接口也会被删除。`)) return
    try {
      await apiDeleteProject(activeTenant, p.id)
      fetchProjects()
    } catch (err: any) {
      alert(err.message)
    }
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
          <p className="text-sm text-zinc-500 mt-1 font-medium">管理您的 API 项目，每个项目绑定一个数据源</p>
        </div>
        <Link href={`/${activeTenant}/projects/register`}>
          <Button className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" /> 创建项目
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-400 text-sm">加载中...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderGit2 className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">暂无项目</p>
          <p className="text-zinc-400 text-xs mt-1">点击「创建项目」开始</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/${activeTenant}/projects/${project.id}/apis`}>
              <Card className="bg-white border-zinc-100 rounded-lg shadow-sm hover:shadow-md hover:border-blue-600/30 transition-all duration-300 cursor-pointer h-full flex flex-col pt-1 group">
                <CardHeader className="px-5 pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-zinc-50 rounded-lg border border-zinc-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                      <FolderGit2 className="w-5 h-5 text-zinc-400 group-hover:text-blue-600" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600" onClick={(e) => handleEdit(e, project)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500" onClick={(e) => handleDelete(e, project)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mt-1.5 min-h-[32px]">
                    {project.description || "暂无描述"}
                  </CardDescription>
                </CardHeader>
                <div className="mt-auto px-5 py-4 border-t border-zinc-50 flex items-center bg-zinc-50/10">
                  <Database className="w-3.5 h-3.5 mr-2 text-blue-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">数据源 #{project.datasource_id}</span>
                </div>
              </Card>
            </Link>
          ))}

          <Link href={`/${activeTenant}/projects/register`} className="group">
            <div className="border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center p-6 bg-zinc-50/20 hover:bg-white hover:border-blue-600/30 hover:shadow-sm transition-all cursor-pointer h-full min-h-[180px]">
              <div className="w-12 h-12 rounded-full border border-zinc-100 flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                <Plus className="w-6 h-6 text-zinc-300 group-hover:text-white" />
              </div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">创建项目</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
