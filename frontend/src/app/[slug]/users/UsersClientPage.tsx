"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Plus,
  Search,
  Shield,
  Mail,
  Briefcase,
  Check,
  X,
  Filter,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useProjectStore } from "@/store/useProjectStore"
import { cn } from "@/lib/utils"

export default function UsersClientPage() {
  const { users, projects, assignProject } = useProjectStore()
  const [search, setSearch] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">成员管理</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">管理系统成员及其项目访问权限</p>
        </div>
        <Button className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">
          <Plus className="w-4 h-4 mr-2" />
          邀请新成员
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* User List */}
        <div className={cn("flex flex-col space-y-3", selectedUserId ? "col-span-12 lg:col-span-7" : "col-span-12")}>
          <div className="bg-white border border-zinc-200/60 p-3 rounded-xl flex gap-2 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="快速搜索姓名、邮箱或 ID..."
                className="pl-9 h-9 text-xs bg-zinc-50 border-zinc-100 rounded-lg focus:ring-1 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" className="h-9 text-[10px] font-bold uppercase tracking-wide px-4 border border-zinc-100 hover:bg-zinc-50 text-zinc-500 rounded-lg">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Filter Role
            </Button>
          </div>

          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                layout
                whileHover={{ x: 4 }}
                onClick={() => setSelectedUserId(user.id)}
                className={cn(
                  "relative group cursor-pointer bg-white border rounded-xl p-4 transition-all duration-300",
                  selectedUserId === user.id 
                    ? "border-blue-500/50 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/20" 
                    : "border-zinc-200/60 shadow-sm hover:shadow-md hover:border-blue-500/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold uppercase transition-transform group-hover:scale-110 border",
                        user.role === 'Admin' ? "bg-blue-50 text-blue-600 border-blue-100" :
                        user.role === 'Developer' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        "bg-zinc-50 text-zinc-500 border-zinc-200"
                      )}>
                        {user.name.charAt(0)}
                      </div>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm",
                        user.role === 'Admin' ? "bg-blue-500" :
                        user.role === 'Developer' ? "bg-emerald-500" :
                        "bg-zinc-400"
                      )} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight">{user.name}</h4>
                      <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight border shadow-sm mb-1",
                        user.role === 'Admin' ? "text-blue-600 border-blue-100 bg-blue-50" :
                        user.role === 'Developer' ? "text-emerald-600 border-emerald-100 bg-emerald-50" :
                        "text-zinc-500 border-zinc-200 bg-zinc-50"
                      )}>
                        {user.role}
                      </span>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{user.assignedProjects.length} Projects</p>
                    </div>
                    <div className={cn(
                      "w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                      selectedUserId === user.id ? "opacity-100 bg-blue-50 border-blue-100" : "bg-zinc-50"
                    )}>
                      <ChevronRight className={cn("w-4 h-4 text-zinc-400", selectedUserId === user.id && "text-blue-500")} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Assignment Sidebar */}
        <AnimatePresence>
          {selectedUserId && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="col-span-12 lg:col-span-5 flex flex-col space-y-4"
            >
              <div className="bg-white border border-zinc-200/60 rounded-xl shadow-lg p-6 flex flex-col h-full relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center">
                      <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                      权限控制台
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-1 ml-6">
                      User: {selectedUser?.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full hover:bg-zinc-100 transition-colors"
                    onClick={() => setSelectedUserId(null)}
                  >
                    <X className="w-4 h-4 text-zinc-400" />
                  </Button>
                </div>

                <div className="space-y-4 overflow-auto max-h-[500px] pr-2 relative z-10">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">项目权限矩阵</span>
                    <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-zinc-100 text-zinc-400">{selectedUser?.assignedProjects.length} Selected</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {projects.map((project) => (
                      <motion.div
                        key={project.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => assignProject(selectedUserId, project.id)}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-300",
                          selectedUser?.assignedProjects.includes(project.id)
                            ? "border-blue-500/30 bg-blue-50/30 shadow-sm"
                            : "border-zinc-100 bg-zinc-50/20 hover:border-zinc-200"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                            selectedUser?.assignedProjects.includes(project.id) 
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                              : "bg-zinc-100 text-zinc-400"
                          )}>
                            {project.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-800">{project.name}</p>
                            <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-tight truncate max-w-[120px]">{project.id.split('-').pop()}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                          selectedUser?.assignedProjects.includes(project.id) 
                            ? "bg-blue-600 border-blue-600 shadow-md" 
                            : "bg-white border-zinc-200"
                        )}>
                          {selectedUser?.assignedProjects.includes(project.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-8 relative z-10">
                  <div className="bg-blue-50/30 rounded-xl p-4 border border-blue-100/50 mb-6">
                    <p className="text-[10px] font-bold text-blue-700 uppercase mb-2 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      安全说明
                    </p>
                    <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
                      该用户将继承 <strong className="text-blue-700">{selectedUser?.role}</strong> 角色的所有全局属性，并获准访问上述选定的项目核心资源。
                    </p>
                  </div>
                  <Button className="w-full h-10 bg-zinc-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all">
                    确认并同步配置
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
