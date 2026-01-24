"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, ArrowLeft, Save, Sparkles, Server, Zap, AlertCircle } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function RegisterModelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const modelId = searchParams.get("id")
  const isEdit = !!modelId

  const [formData, setFormData] = useState({
    name: "",
    id: "",
    runner: "",
    upstream: "",
    context: "32768",
    type: "chat"
  })

  // Mock loading existing data for edit
  useEffect(() => {
    if (isEdit) {
      if (modelId === "deepseek-r1") {
        setFormData({
          name: "DeepSeek R1",
          id: "deepseek-r1",
          runner: "idc-1",
          upstream: "http://192.168.1.10:11434",
          context: "131072",
          type: "reasoning"
        })
      }
    }
  }, [isEdit, modelId])

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/models">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {isEdit ? "编辑 AI 引擎配置" : "接入新 AI 引擎"}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {isEdit ? "更新 AI 引擎推理参数与接入节点信息。" : "映射本地/内网推理服务至 OwlApi。"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-10 px-6 font-bold text-zinc-600">取消</Button>
          <Button className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20">
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? "更新配置" : "完成接入"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-zinc-200 shadow-sm">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">模型名称 (Display Name)</Label>
                  <Input 
                    placeholder="e.g. DeepSeek-R1-Local" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="h-11 bg-zinc-50/50 border-zinc-200 transition-all focus:bg-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">模型 ID (Identifier)</Label>
                  <Input 
                    placeholder="e.g. deepseek-r1" 
                    disabled={isEdit}
                    value={formData.id}
                    onChange={(e) => setFormData({...formData, id: e.target.value})}
                    className="h-11 font-mono bg-zinc-50 border-zinc-200 text-zinc-500" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-zinc-400">接入执行节点 (Runner)</Label>
                <Select value={formData.runner} onValueChange={(val) => setFormData({...formData, runner: val})}>
                  <SelectTrigger className="h-11 bg-zinc-50/50 border-zinc-200">
                    <SelectValue placeholder="选择承载该模型的 Runner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idc-1">IDC-Runner #1 (192.168.1.10)</SelectItem>
                    <SelectItem value="ali-2">Aliyun-Runner #2 (ECS-Shanghai)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-zinc-400">只有在线状态的 Runner 才能代理模型请求。</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-zinc-400">上游推理服务地址 (Upstream URL)</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="http://localhost:11434" 
                    value={formData.upstream}
                    onChange={(e) => setFormData({...formData, upstream: e.target.value})}
                    className="h-11 bg-zinc-50/50 border-zinc-200" 
                  />
                  <Button variant="outline" className="h-11 px-4 text-xs font-bold border-zinc-200 hover:bg-zinc-50">
                    <Zap className="w-3.5 h-3.5 mr-2 text-amber-500" />
                    连通测试
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-400">通常为 Ollama (11434) 或 vLLM (8000) 的服务端口。</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 border-zinc-200 shadow-sm">
             <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-blue-500" />
               模型推断参数
             </h3>
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">上下文上限 (Context Window)</Label>
                  <Input 
                    type="number" 
                    value={formData.context}
                    onChange={(e) => setFormData({...formData, context: e.target.value})}
                    className="h-11 bg-zinc-50/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">模型技能分类</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                    <SelectTrigger className="h-11 bg-zinc-50/50 border-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat">Standard Chat (对话)</SelectItem>
                      <SelectItem value="reasoning">Reasoning Mode (思维链/推理)</SelectItem>
                      <SelectItem value="embedding">Text Embedding (向量化)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
             </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-blue-600 rounded-xl p-6 text-white shadow-xl shadow-blue-500/20">
             <Brain className="w-10 h-10 mb-4 opacity-80" />
             <h4 className="font-bold text-lg mb-2 italic">网关代理机制</h4>
             <p className="text-blue-100 text-xs leading-relaxed">
               一旦模型接入成功，控制台将自动为您生成一个标准的 OpenAI 兼容 Endpoint。
               您的执行节点将作为代理层，处理身份验证、流量削峰及上下文自动裁剪。
             </p>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              配置建议
            </h4>
            <div className="space-y-3">
               <div className="flex gap-3">
                 <div className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-zinc-500">1</div>
                 <p className="text-[11px] text-zinc-500 leading-normal">建议将 Runner 部署在模型所在的同一台机器或万兆局域网内，以降低推理延迟。</p>
               </div>
               <div className="flex gap-3">
                 <div className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-zinc-500">2</div>
                 <p className="text-[11px] text-zinc-500 leading-normal">如果使用 Ollama，请确保环境变量 `OLLAMA_HOST=0.0.0.0` 已设置。</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
