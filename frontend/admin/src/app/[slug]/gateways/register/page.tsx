"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, Server, Shield, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useUIStore } from "@/store/useUIStore"
import { apiCreateGateway, type CreateGatewayResponse } from "@/lib/api-client"

export default function RegisterGatewayPage() {
  const { activeTenant } = useUIStore()
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [created, setCreated] = useState<CreateGatewayResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("请输入节点名称")
      return
    }
    try {
      setError("")
      const gw = await apiCreateGateway(activeTenant, name.trim())
      setCreated(gw)
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const composeYaml = created
    ? `services:
  gateway:
    image: registry.cn-hangzhou.aliyuncs.com/owlapi/gateway:latest
    container_name: owlapi_gateway
    restart: unless-stopped
    environment:
      - OWLAPI_SERVER_URL=dns:///your-server:9090
      - OWLAPI_GATEWAY_ID=${created.id}
      - OWLAPI_GATEWAY_TOKEN=${created.token}
      - OWLAPI_TENANT_ID=${created.tenant_id}
      - OWLAPI_LOG_LEVEL=info
      - TZ=Asia/Shanghai`
    : ""

  const handleCopy = () => {
    navigator.clipboard.writeText(composeYaml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="mb-8 text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Server className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">部署新的网关节点</h1>
        <p className="text-sm text-zinc-500 mt-1 font-medium">创建节点后，使用生成的 Token 在目标服务器上启动 Gateway。</p>
      </div>

      <div className="flex items-center justify-center space-x-4 mb-10">
        <StepIndicator num={1} active={step >= 1} label="配置信息" />
        <div className={`w-12 h-[1px] ${step >= 2 ? 'bg-blue-600' : 'bg-zinc-200'}`} />
        <StepIndicator num={2} active={step >= 2} label="安装部署" />
      </div>

      <div className="bg-white border border-zinc-100 rounded-lg shadow-sm overflow-hidden">
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>节点名称</Label>
              <Input
                placeholder="e.g. Aliyun-Shanghai-01"
                className="bg-zinc-50"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-[11px] text-zinc-400">仅用于在控制台中识别该节点，建议包含位置和用途。</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-blue-900 uppercase">通用接入模式</h4>
                <p className="text-[11px] text-blue-800 mt-1 leading-relaxed">
                  创建后会生成唯一的 Gateway Token，用于在目标服务器上启动 Gateway 进程并注册到 Control Plane。
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 font-bold">
                创建并生成 Token
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && created && (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">1. 创建 docker-compose.yml</p>
              <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-white relative group">
                <div className="absolute top-3 right-3">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="leading-relaxed pr-12 text-emerald-400 whitespace-pre text-[13px]">{composeYaml}</div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">2. 启动网关</p>
              <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-emerald-400">
                docker compose up -d
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase">安全须知</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Token 仅在此页面显示一次，请妥善保存。如果丢失需要删除节点重新创建。
                  请将 <code className="bg-amber-100 px-1 rounded">your-server:9090</code> 替换为 Control Plane 的实际地址。
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Link href={`/${activeTenant}/gateways`}>
                <Button className="bg-blue-600 hover:bg-blue-700 font-bold">
                  完成，返回列表
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ num, active, label }: { num: number; active: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-400'
      }`}>
        {num}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-blue-600' : 'text-zinc-400'}`}>
        {label}
      </span>
    </div>
  )
}
