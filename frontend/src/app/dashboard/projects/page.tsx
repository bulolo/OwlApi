"use client"

import { useProjectStore } from "@/store/useProjectStore"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FolderGit2, ChevronRight, Clock, Settings } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function DashboardPage() {
  const { projects } = useProjectStore()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">所有项目</h2>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">管理与监控您的 API 集合</p>
        </div>
        <Link href="/dashboard/projects/register">
          <Button className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all group">
            <Plus className="w-4 h-4 mr-2" />
            创建项目
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="group relative"
          >
            <Link href={`/dashboard/projects/${project.id}/apis`}>
              <Card className="bg-white border-zinc-200 hover:border-blue-400 hover:shadow-md transition-all duration-300 cursor-pointer h-full flex flex-col pt-1">
                <CardHeader className="px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-zinc-50 rounded border border-zinc-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <FolderGit2 className="w-4 h-4 text-zinc-400 group-hover:text-blue-500" />
                    </div>
                    <Link href={`/dashboard/projects/register?id=${project.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-100">
                        <Settings className="w-3.5 h-3.5 text-zinc-400 hover:text-blue-500" />
                      </Button>
                    </Link>
                  </div>
                  <CardTitle className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 truncate">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500 leading-normal line-clamp-2 mt-1 min-h-[32px]">
                    {project.description}
                  </CardDescription>
                </CardHeader>

                <div className="mt-auto px-4 py-3 border-t border-zinc-50 flex items-center justify-between bg-zinc-50/10">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{project.apis.length} API</span>
                  </div>
                  <div className="flex items-center text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                    <Clock className="w-3 h-3 mr-1" />
                    2h ago
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}

        {/* Dense Add Project */}
        <Link href="/dashboard/projects/register" className="group">
          <div className="border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center p-6 bg-white hover:bg-zinc-50 hover:border-blue-300 transition-all cursor-pointer h-full min-h-[160px]">
            <div className="w-10 h-10 rounded-full border border-zinc-100 flex items-center justify-center mb-3 bg-white shadow-sm group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 text-zinc-300 group-hover:text-blue-500" />
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-tight">初始化环境</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
