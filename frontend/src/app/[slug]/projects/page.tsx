"use client"

import { useProjectStore } from "@/store/useProjectStore"
import { useUIStore } from "@/store/useUIStore"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FolderGit2, Clock, Settings } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const { activeTenant } = useUIStore()
  const { projects } = useProjectStore()
  const router = useRouter()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">接口中心</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">管理与监控您的 API 集合</p>
        </div>
        <Link href={`/${activeTenant}/projects/register`}>
          <Button className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" />
            创建项目
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ y: -4 }}
            className="group relative"
          >
            <Link href={`/${activeTenant}/projects/${project.id}/apis`}>
              <Card className="bg-white border-zinc-200/60 rounded-xl shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 cursor-pointer h-full flex flex-col pt-1">
                <CardHeader className="px-5 pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-zinc-50 rounded-lg border border-zinc-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                      <FolderGit2 className="w-5 h-5 text-zinc-400 group-hover:text-blue-600" />
                    </div>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        router.push(`/${activeTenant}/projects/register?id=${project.id}`)
                      }}
                      className="cursor-pointer"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-100">
                        <Settings className="w-4 h-4 text-zinc-400 hover:text-blue-500" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mt-1.5 min-h-[32px]">
                    {project.description}
                  </CardDescription>
                </CardHeader>

                <div className="mt-auto px-5 py-4 border-t border-zinc-50 flex items-center justify-between bg-zinc-50/10">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{project.apis.length} Active APIs</span>
                  </div>
                  <div className="flex items-center text-[10px] text-zinc-400 font-medium uppercase tracking-wide">
                    <Clock className="w-3 h-3 mr-1" />
                    2h ago
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}

        <Link href={`/${activeTenant}/projects/register`} className="group">
          <div className="border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center p-6 bg-zinc-50/20 hover:bg-white hover:border-blue-400/50 hover:shadow-xl transition-all cursor-pointer h-full min-h-[180px]">
            <div className="w-12 h-12 rounded-full border border-zinc-100 flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
              <Plus className="w-6 h-6 text-zinc-300 group-hover:text-white" />
            </div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">初始化环境</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
