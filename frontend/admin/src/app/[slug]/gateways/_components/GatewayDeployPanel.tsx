"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Gateway } from "@/lib/api-client"

interface GatewayDeployPanelProps {
  gateway: Gateway
  onClose: () => void
}

export function GatewayDeployPanel({ gateway, onClose }: GatewayDeployPanelProps) {
  const [copied, setCopied] = useState(false)

  const composeYaml = `services:
  gateway:
    image: registry.cn-hangzhou.aliyuncs.com/owlapi/gateway:latest
    container_name: owlapi_gateway
    restart: unless-stopped
    environment:
      - OWLAPI_SERVER_URL=dns:///your-server:9090
      - OWLAPI_GATEWAY_ID=${gateway.id}
      - OWLAPI_GATEWAY_TOKEN=${gateway.token}
      - OWLAPI_TENANT_ID=${gateway.tenant_id}
      - OWLAPI_LOG_LEVEL=info
      - TZ=Asia/Shanghai`

  const handleCopy = () => {
    navigator.clipboard.writeText(composeYaml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-zinc-100 rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-900">部署信息 — {gateway.name}</h3>
        <Button variant="ghost" size="sm" className="text-xs text-zinc-400" onClick={onClose}>关闭</Button>
      </div>
      <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-emerald-400 relative">
        <div className="absolute top-3 right-3">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <pre className="whitespace-pre pr-12 text-sm">{composeYaml}</pre>
      </div>
      <p className="text-xs text-zinc-400">
        将 <code className="bg-zinc-100 px-1 rounded">your-server:9090</code> 替换为 Control Plane 的实际地址，然后执行 <code className="bg-zinc-100 px-1 rounded">docker compose up -d</code>
      </p>
    </div>
  )
}
