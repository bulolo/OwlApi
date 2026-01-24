"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Box, ArrowLeft, Save, Shield, Database, Globe, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useProjectStore } from "@/store/useProjectStore"

export default function RegisterProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("id")
  const isEdit = !!projectId
  const { projects } = useProjectStore()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    environment: "development",
    visibility: "private"
  })

  useEffect(() => {
    if (isEdit) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setFormData({
          name: project.name,
          description: project.description || "",
          environment: "production", // Mocking env selection
          visibility: "private"
        })
      }
    }
  }, [isEdit, projectId, projects])

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {isEdit ? "编辑项目配置" : "初始化新项目"}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {isEdit ? "更新 API 引擎的基本信息与运行策略。" : "创建一个新的 API 引擎集合，开始构建您的数据接口。"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-10 px-6 font-bold text-zinc-600">取消</Button>
          <Button className="h-10 px-8 bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-lg shadow-zinc-500/20">
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? "保存更改" : "创建项目"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-zinc-200 shadow-sm">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-zinc-400">项目名称 (Project Name)</Label>
                <Input 
                  placeholder="e.g. 电商核心业务系统" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-11 bg-zinc-50/50 border-zinc-200 transition-all focus:bg-white" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-zinc-400">项目描述 (Description)</Label>
                <Textarea 
                  placeholder="简述该项目的主要功能与调用方信息" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="min-h-[100px] bg-zinc-50/50 border-zinc-200 transition-all focus:bg-white resize-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">初始运行环境</Label>
                  <Select value={formData.environment} onValueChange={(val) => setFormData({...formData, environment: val})}>
                    <SelectTrigger className="h-11 bg-zinc-50/50 border-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development (开发环境)</SelectItem>
                      <SelectItem value="production">Production (生产环境)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">可见性策略</Label>
                  <Select value={formData.visibility} onValueChange={(val) => setFormData({...formData, visibility: val})}>
                    <SelectTrigger className="h-11 bg-zinc-50/50 border-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private (仅团队成员)</SelectItem>
                      <SelectItem value="public">Internal Public (全员只读)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 flex items-start gap-3">
             <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
             <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase">环境隔离建议</h4>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  每个项目都拥有独立的数据源绑定与权限体系。建议根据业务域（如：订单、营销、后台）进行项目划分，
                  避免单个项目中包含过多的 API，这有利于提高维护效率和安全精细度。
                </p>
             </div>
          </div>
        </div>

        {/* Sidebar Decor */}
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-xl p-6 text-white shadow-xl">
             <Box className="w-10 h-10 mb-4 text-blue-500" />
             <h4 className="font-bold text-lg mb-2 italic text-zinc-100">API 引擎核心</h4>
             <p className="text-zinc-400 text-xs leading-relaxed">
               项目是 OwlApi 的最小管理单元。通过项目，您可以实现：
             </p>
             <ul className="mt-4 space-y-2">
               <li className="flex items-center gap-2 text-[10px] text-zinc-300">
                 <Database className="w-3 h-3 text-blue-500" />
                 独立的数据源绑定逻辑
               </li>
               <li className="flex items-center gap-2 text-[10px] text-zinc-300">
                 <Shield className="w-3 h-3 text-blue-500" />
                 精细化的接口鉴权策略
               </li>
               <li className="flex items-center gap-2 text-[10px] text-zinc-300">
                 <Globe className="w-3 h-3 text-blue-500" />
                 统一的对外发布域名
               </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
