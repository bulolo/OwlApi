"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Brain, Sparkles, Key, Zap, RefreshCw, Plus, Server, Settings, Activity } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useUIStore } from "@/store/useUIStore"
import { cn } from "@/lib/utils"

const MOCK_MODELS = [
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "接入节点: IDC-Runner #1",
    status: "online",
    context: "128k",
    type: "Reasoning"
  },
  {
    id: "llama3-70b",
    name: "Llama 3 70B",
    provider: "接入节点: Aliyun-Runner #2",
    status: "online",
    context: "8k",
    type: "Chat"
  },
  {
    id: "qwen-14b",
    name: "Qwen 1.5 14B",
    provider: "接入节点: IDC-Runner #1",
    status: "busy",
    context: "32k",
    type: "Chat"
  }
]

export default function ModelsPage() {
  const { activeTenant } = useUIStore()
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            AI 引擎
          </h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">
            统一纳管内网私有模型，提供兼容 OpenAI 的标准 API 接口。
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/${activeTenant}/models/keys`}>
            <Button variant="outline" className="h-9 text-xs font-bold border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              <Key className="w-3.5 h-3.5 mr-2" />
              API Keys
            </Button>
          </Link>
          <Link href={`/${activeTenant}/models/register`}>
            <Button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 rounded-xl transition-all active:scale-95">
              <Plus className="w-3.5 h-3.5 mr-2" />
              接入模型
            </Button>
          </Link>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {MOCK_MODELS.map((model, i) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="group"
          >
            <Card className="bg-white border-zinc-200/60 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
                    <Brain className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm",
                    model.status === 'online' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    {model.status === 'online' ? 'Proxy Active' : 'Offline'}
                  </Badge>
                </div>
                
                <CardTitle className="text-lg font-bold text-zinc-900 tracking-tight group-hover:text-blue-600 transition-colors">
                  {model.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                   <div className="px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{model.type}</div>
                   <div className="h-3 w-[1px] bg-zinc-200" />
                   <span className="text-[11px] text-zinc-400 font-medium">Context: {model.context}</span>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6 flex flex-col flex-1">
                <div className="space-y-4 flex-1">
                  <div className="p-3 bg-zinc-50/50 rounded-xl border border-zinc-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Server className="w-3 h-3" />
                        Execution Node
                      </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-700">{model.provider.split(": ")[1] || model.provider}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-50">
                      <span className="text-zinc-400 font-medium">Endpoint ID</span>
                      <span className="text-zinc-900 font-mono font-bold text-[10px]">{model.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Link href={`/${activeTenant}/models/register?id=${model.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-9 rounded-xl border-zinc-200 text-xs font-bold hover:bg-zinc-50 text-zinc-600 shadow-sm">
                      <Settings className="w-3.5 h-3.5 mr-2" />
                      配置代理
                    </Button>
                  </Link>
                  <Link href={`/${activeTenant}/models/playground`} className="flex-1">
                    <Button size="sm" className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 transition-all">
                      <Sparkles className="w-3.5 h-3.5 mr-2" />
                      测试连接
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Simplified Add Card */}
        <Link href={`/${activeTenant}/models/register`} className="group h-full">
          <div className="h-full min-h-[280px] rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/20 hover:bg-white hover:border-blue-400/50 hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center mb-5 shadow-sm group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:scale-110 transition-all">
              <Plus className="w-7 h-7 text-zinc-300 group-hover:text-white" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">添加代理模型</h3>
            <p className="text-[11px] text-zinc-400 mt-2 text-center px-4 font-medium leading-relaxed">
              将执行节点上部署的大模型服务 <br/>
              挂载到 API 中心进行统一代理
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function MonitorCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorMap: any = {
    "blue": "text-blue-600 bg-blue-50",
    "amber": "text-amber-600 bg-amber-50",
    "emerald": "text-emerald-600 bg-emerald-50",
    "indigo": "text-indigo-600 bg-indigo-50",
  }

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white border border-zinc-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color] || "bg-zinc-50")}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
        <h3 className="text-2xl font-bold text-zinc-900 mt-1 tracking-tight">{value}</h3>
      </div>
    </motion.div>
  )
}
