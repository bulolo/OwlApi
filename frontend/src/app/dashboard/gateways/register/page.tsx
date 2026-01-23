"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal, Copy, Check, Server, Shield, ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function RegisterGatewayPage() {
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)
  
  const token = "ag_live_x8293...9283"
  const installCmd = `curl -fsSL https://owlapi.com/install.sh | sh -s -- --token ${token}`

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="mb-8 text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
          <Server className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">部署新的 Gateway Agent</h1>
        <p className="text-sm text-zinc-500 mt-2">只需三步，将您的私有网络/本地环境接入 OwlApi 混合云。</p>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center space-x-4 mb-10">
        <StepIndicator num={1} active={step >= 1} label="配置信息" />
        <div className={`w-12 h-[1px] ${step >= 2 ? 'bg-blue-600' : 'bg-zinc-200'}`} />
        <StepIndicator num={2} active={step >= 2} label="执行安装" />
        <div className={`w-12 h-[1px] ${step >= 3 ? 'bg-blue-600' : 'bg-zinc-200'}`} />
        <StepIndicator num={3} active={step >= 3} label="验证连接" />
      </div>

      <div className="bg-white border border-zinc-200/60 rounded-xl shadow-sm overflow-hidden">
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>节点名称 (Node Name)</Label>
                <Input placeholder="e.g. Aliyun-Shanghai-Prod-01" className="bg-zinc-50" />
                <p className="text-[11px] text-zinc-400">仅用于识别，建议包含区域和环境信息。</p>
              </div>
              
              <div className="space-y-2">
                 <Label>网络环境 (Network)</Label>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="border hover:border-blue-500 cursor-pointer p-4 rounded-lg bg-zinc-50 hover:bg-white transition-all">
                      <div className="font-bold text-sm text-zinc-900 mb-1">公有云 / IDC (Public IP)</div>
                      <p className="text-[10px] text-zinc-500">服务器拥有公网访问能力，可直接连接控制面。</p>
                   </div>
                   <div className="border border-blue-500 bg-blue-50/20 cursor-pointer p-4 rounded-lg">
                      <div className="font-bold text-sm text-blue-700 mb-1">内网 / NAT (Private)</div>
                      <p className="text-[10px] text-zinc-500">无公网 IP，通过反向隧道连接 (Tunnel Mode)。</p>
                   </div>
                 </div>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700 font-bold">
                下一步
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-6">
            <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-white relative group">
              <div className="absolute top-3 right-3">
                 <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" onClick={handleCopy}>
                   {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                 </Button>
              </div>
              <div className="text-zinc-500 select-none mb-2"># 在目标服务器上执行以下命令</div>
              <div className="leading-relaxed break-all pr-12 text-emerald-400">
                {installCmd}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase">安全须知</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  该 Token 有效期为 24 小时，且只能激活一个 Agent 节点。
                  请确保目标机器已安装 Docker 且允许出站访问 `connect.owlapi.com:443`。
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>
              <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 font-bold">
                已执行命令，验证连接
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6 relative">
               <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-zinc-200 animate-spin" />
               <Server className="w-6 h-6 text-zinc-400" />
             </div>
             <h3 className="text-lg font-bold text-zinc-900">正在等待心跳...</h3>
             <p className="text-sm text-zinc-500 mt-2 max-w-sm">
               控制面正在侦听来自节点的第一次握手信号。通常需要 15-30 秒。
             </p>
             
             <div className="mt-8 w-full max-w-md bg-zinc-50 rounded border p-3 text-xs font-mono text-zinc-400 text-left">
               &gt; Waiting for connection...<br/>
               &gt; <span className="text-zinc-300">Scanning tunnel endpoints</span>
             </div>

             <div className="mt-8">
               <Link href="/dashboard/gateways">
                <Button variant="outline" className="text-xs font-bold border-zinc-200">
                  后台运行，返回列表
                </Button>
               </Link>
             </div>
           </motion.div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ num, active, label }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
        ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-zinc-100 text-zinc-400'}
      `}>
        {num}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'text-blue-600' : 'text-zinc-400'}`}>
        {label}
      </span>
    </div>
  )
}
