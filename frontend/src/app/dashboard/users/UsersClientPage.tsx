"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Shield,
  Mail,
  Briefcase,
  Check,
  X,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProjectStore, type User, type Project } from "@/store/useProjectStore"
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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">用户中心</h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">管理系统成员及其项目访问权限</p>
        </div>
        <Button className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all group">
          <Plus className="w-4 h-4 mr-2" />
          邀请新成员
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* User List */}
        <div className={cn("flex flex-col space-y-4", selectedUserId ? "col-span-12 lg:col-span-7" : "col-span-12")}>
          <div className="bg-white border p-3 rounded-lg flex gap-2 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="搜索姓名或邮箱..."
                className="pl-8 h-8 text-xs bg-zinc-50 border-zinc-100 rounded focus:ring-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" className="h-8 text-xs font-bold px-3 border border-zinc-100 hover:bg-zinc-50 text-zinc-600">
              <Filter className="w-3.5 h-3.5 mr-2" />
              角色
            </Button>
          </div>

          <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 bg-zinc-50/50 border-b px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <div className="col-span-5">成员信息</div>
              <div className="col-span-4 text-center">角色</div>
              <div className="col-span-3 text-right">已分配项目</div>
            </div>
            <div className="divide-y divide-zinc-100">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={cn(
                    "grid grid-cols-12 px-4 py-3 items-center cursor-pointer transition-colors",
                    selectedUserId === user.id ? "bg-blue-50/50" : "hover:bg-zinc-50/50"
                  )}
                >
                  <div className="col-span-5 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-800">{user.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium truncate max-w-[150px]">{user.email}</p>
                    </div>
                  </div>
                  <div className="col-span-4 text-center">
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border",
                      user.role === 'Admin' ? "text-blue-600 border-blue-100 bg-blue-50/50" :
                        user.role === 'Developer' ? "text-emerald-600 border-emerald-100 bg-emerald-50/50" :
                          "text-zinc-500 border-zinc-200 bg-zinc-50/50"
                    )}>
                      {user.role}
                    </span>
                  </div>
                  <div className="col-span-3 text-right text-[11px] font-bold text-zinc-500 tracking-tighter">
                    {user.assignedProjects.length} 个项目
                  </div>
                </div>
              ))}
            </div>
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
              <div className="bg-white border rounded-lg shadow-sm p-5 flex flex-col h-full relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                    权限分配: {selectedUser?.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 rounded-md"
                    onClick={() => setSelectedUserId(null)}
                  >
                    <X className="w-4 h-4 text-zinc-400" />
                  </Button>
                </div>

                <div className="space-y-4 overflow-auto max-h-[500px] pr-2 custom-scrollbar">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">项目名单</div>
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => assignProject(selectedUserId, project.id)}
                      className={cn(
                        "p-3 rounded-md border flex items-center justify-between cursor-pointer transition-all",
                        selectedUser?.assignedProjects.includes(project.id)
                          ? "border-blue-200 bg-blue-50/50 shadow-sm"
                          : "border-zinc-100 bg-zinc-50/30 hover:border-zinc-200"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold",
                          selectedUser?.assignedProjects.includes(project.id) ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-400"
                        )}>
                          {project.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-800">{project.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">{project.description}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        selectedUser?.assignedProjects.includes(project.id) ? "bg-blue-600 border-blue-600" : "bg-white border-zinc-200"
                      )}>
                        {selectedUser?.assignedProjects.includes(project.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t flex flex-col space-y-4">
                  <div className="bg-zinc-50 rounded p-3 border border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-800 uppercase mb-1">管理员说明</p>
                    <p className="text-[11px] text-zinc-500 leading-normal">
                      分配项目后，该用户将根据其角色（{selectedUser?.role}）获得相应的读写权限。
                    </p>
                  </div>
                  <Button className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md">
                    完成配置并同步
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
