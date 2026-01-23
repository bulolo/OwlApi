"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Database, 
  ArrowLeft, 
  Save, 
  Server, 
  Globe, 
  ShieldCheck,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProjectStore } from "@/store/useProjectStore"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function NewDataSourceClientPage() {
  const router = useRouter()
  const { gateways, addDataSource } = useProjectStore()
  
  const [formData, setFormData] = useState({
    name: "",
    type: "MySQL",
    isDual: true,
    dev: { host: "", port: 3306, gatewayId: gateways[0]?.id || "", status: "Pending" as const },
    prod: { host: "", port: 3306, gatewayId: gateways[1]?.id || gateways[0]?.id || "", status: "Pending" as const }
  })

  const handleSave = () => {
    // Basic verification
    if (!formData.name) return alert("请输入数据源名称")
    
    addDataSource({
      name: formData.name,
      type: formData.type as any,
      isDual: formData.isDual,
      dev: formData.dev,
      prod: formData.isDual ? formData.prod : undefined
    })
    router.push("/dashboard/data-sources")
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/data-sources">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">接入新数据源</h1>
            <p className="text-sm text-zinc-500 mt-1">配置多环境数据库连接及对应的执行节点</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-10 px-6 font-bold text-zinc-600">取消</Button>
          <Button onClick={handleSave} className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20">
            <Save className="w-4 h-4 mr-2" />
            建立连接推演
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Basic Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card className="p-6 border-zinc-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
               <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-none text-[9px] font-black underline decoration-zinc-300">CONFIG</Badge>
            </div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-6 flex items-center">
              <Info className="w-4 h-4 mr-2 text-blue-500" />
              基础配置
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                  <span>数据源名称</span>
                  <span className="text-[10px] text-zinc-300 italic underline decoration-dotted">REQUIRED</span>
                </Label>
                <Input 
                  placeholder="例如：核心业务从库" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="h-10 text-sm focus:ring-1 border-zinc-200 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase">数据库类型</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger className="h-10 text-sm border-zinc-200 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MySQL">MySQL</SelectItem>
                    <SelectItem value="PostgreSQL">PostgreSQL</SelectItem>
                    <SelectItem value="StarRocks">StarRocks (OLAP)</SelectItem>
                    <SelectItem value="MongoDB">MongoDB</SelectItem>
                    <SelectItem value="Oracle">Oracle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase">多环境支持</Label>
                  <Switch 
                    checked={formData.isDual} 
                    onCheckedChange={checked => setFormData({...formData, isDual: checked})}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                  开启后可分别配置 开发(DEV) 和 生产(PROD) 两个独立节点与地址。
                </p>
              </div>
            </div>
          </Card>

          <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl shadow-sm">
             <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                安全与合规
             </h4>
             <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
               OwlAPI 采用<strong>隧道穿透</strong>技术。您的数据库凭据在浏览器端脱敏，仅在执行节点内部加密存储。
             </p>
          </div>
        </div>

        {/* Right: Environment Configs */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* DEV Environment */}
          <Card className="p-6 border-zinc-200/60 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                  <Globe className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 uppercase">{formData.isDual ? "开发环境 (DEV)" : "配置连接 (BASE)"}</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                    {formData.isDual ? "用于日常开发、调试与推演测试" : "所有环境均共用此数据库连接配置"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">主机地址 / Host</Label>
                  <Input 
                    placeholder="dev-db.internal" 
                    value={formData.dev.host}
                    onChange={e => setFormData({...formData, dev: {...formData.dev, host: e.target.value}})}
                    className="h-10 font-mono text-xs border-zinc-200 shadow-none focus:ring-emerald-500/20 bg-white"
                  />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">端口 / Port</Label>
                  <Input 
                    type="number"
                    value={formData.dev.port}
                    onChange={e => setFormData({...formData, dev: {...formData.dev, port: parseInt(e.target.value)}})}
                    className="h-10 font-mono text-xs border-zinc-200 shadow-none focus:ring-emerald-500/20 bg-white"
                  />
               </div>
               <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">绑定执行节点 (Runner Node)</Label>
                  <Select value={formData.dev.gatewayId} onValueChange={v => setFormData({...formData, dev: {...formData.dev, gatewayId: v}})}>
                    <SelectTrigger className="h-12 border-zinc-200 bg-white hover:bg-zinc-50 transition-colors">
                      <SelectValue placeholder="选择执行节点..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {gateways.map(gw => (
                        <SelectItem key={gw.id} value={gw.id} className="focus:bg-zinc-50">
                          <div className="flex items-center">
                            <Server className={cn("w-3.5 h-3.5 mr-2", gw.status === 'Online' ? "text-emerald-500" : "text-zinc-300")} />
                            <span className="font-bold">{gw.name}</span>
                            <span className="ml-2 text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-100 rounded tracking-tighter">{gw.address}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
            </div>
          </Card>

          {/* PROD Environment */}
          {formData.isDual && (
            <Card className="p-6 border-zinc-200/60 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-900 uppercase">生产环境 (PROD)</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">面向线上正式服务的数据库配置</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">主机地址 / Host</Label>
                    <Input 
                      placeholder="db-prod.vpc.internal" 
                      value={formData.prod.host}
                      onChange={e => setFormData({...formData, prod: {...formData.prod, host: e.target.value}})}
                      className="h-10 font-mono text-xs border-zinc-200 shadow-none focus:ring-blue-600/20"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">端口 / Port</Label>
                    <Input 
                      type="number"
                      value={formData.prod.port}
                      onChange={e => setFormData({...formData, prod: {...formData.prod, port: parseInt(e.target.value)}})}
                      className="h-10 font-mono text-xs border-zinc-200 shadow-none focus:ring-blue-600/20"
                    />
                 </div>
                 <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">绑定执行节点 (Runner Node)</Label>
                    <Select value={formData.prod.gatewayId} onValueChange={v => setFormData({...formData, prod: {...formData.prod, gatewayId: v}})}>
                      <SelectTrigger className="h-12 border-zinc-200 bg-blue-600/5 hover:bg-blue-600/10 transition-colors">
                        <SelectValue placeholder="选择执行节点..." />
                      </SelectTrigger>
                      <SelectContent>
                        {gateways.map(gw => (
                          <SelectItem key={gw.id} value={gw.id}>
                            <div className="flex items-center">
                              <Server className={cn("w-3.5 h-3.5 mr-2", gw.status === 'Online' ? "text-blue-500" : "text-zinc-300")} />
                              <span className="font-bold">{gw.name}</span>
                              <span className="ml-2 text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-100 rounded tracking-tighter">{gw.address}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
              </div>
            </Card>
          )}

          {!formData.isDual && (
            <div className="p-10 border-2 border-dashed border-zinc-100 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                <ArrowLeft className="w-6 h-6 text-zinc-200 rotate-180" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-400 italic">单环境模式已启用</p>
                <p className="text-[10px] text-zinc-300 max-w-[240px] mt-1 leading-relaxed">
                  当前仅配置 DEV 环境。如需配置生产环境，请在左侧开启“多环境支持”。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
