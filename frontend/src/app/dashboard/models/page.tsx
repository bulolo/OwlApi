"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Brain, Sparkles, Key, Zap, RefreshCw, Plus } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

const MOCK_MODELS = [
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "Gateway Agent #1 (Local IDC)",
    status: "online",
    context: "128k",
    type: "Reasoning"
  },
  {
    id: "llama3-70b",
    name: "Llama 3 70B",
    provider: "Gateway Agent #2 (Aliyun ECS)",
    status: "online",
    context: "8k",
    type: "Chat"
  },
  {
    id: "qwen-14b",
    name: "Qwen 1.5 14B",
    provider: "Gateway Agent #1 (Local IDC)",
    status: "busy",
    context: "32k",
    type: "Chat"
  }
]

export default function ModelsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI 模型网关
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            统一纳管内网私有模型，提供兼容 OpenAI 的标准 API 接口。
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/models/keys">
            <Button variant="outline" className="h-9 text-xs font-bold border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              <Key className="w-3.5 h-3.5 mr-2" />
              API Keys
            </Button>
          </Link>
          <Button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm">
            <Plus className="w-3.5 h-3.5 mr-2" />
            接入模型
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MOCK_MODELS.map((model, i) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="group hover:border-blue-400 hover:shadow-md transition-all duration-300 cursor-pointer border-zinc-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100/50">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <Badge variant="outline" className={`
                    ${model.status === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}
                    capitalize font-bold tracking-tight px-2 py-0.5
                  `}>
                    {model.status}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
                  {model.name}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 font-mono">
                  {model.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-50">
                    <span className="text-zinc-400 font-medium">来源节点</span>
                    <span className="text-zinc-700 font-medium truncate max-w-[140px]">{model.provider}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-50">
                    <span className="text-zinc-400 font-medium">上下文窗口</span>
                    <span className="text-zinc-700 font-mono font-bold">{model.context}</span>
                  </div>
                   <div className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-50">
                    <span className="text-zinc-400 font-medium">模型类型</span>
                    <span className="text-zinc-700 font-medium">{model.type}</span>
                  </div>
                  
                  <div className="pt-2 flex gap-2">
                    <Button variant="secondary" size="sm" className="w-full text-xs font-bold h-8 bg-zinc-100 hover:bg-zinc-200 text-zinc-600">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      测试连通性
                    </Button>
                    <Link href="/dashboard/models/playground" className="w-full">
                      <Button variant="default" size="sm" className="w-full text-xs font-bold h-8 bg-zinc-900 hover:bg-zinc-800 text-white">
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        Playground
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        
        {/* Add New Card */}
        <div className="border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center p-6 bg-zinc-50/30 hover:bg-white hover:border-blue-300 transition-all cursor-pointer group min-h-[280px]">
           <div className="w-12 h-12 rounded-full border border-zinc-100 flex items-center justify-center mb-3 bg-white shadow-sm group-hover:scale-105 transition-transform group-hover:text-blue-600 text-zinc-300">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">接入新模型</h3>
          <p className="text-xs text-zinc-400 mt-1 text-center px-8">
            通过 Gateway Agent 扫描并代理内网 LLM 服务 (Ollama/vLLM)
          </p>
        </div>
      </div>
    </div>
  )
}
