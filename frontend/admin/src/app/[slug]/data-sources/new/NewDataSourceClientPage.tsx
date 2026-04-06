"use client"

import { useState, useEffect } from "react"
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
import { useUIStore } from "@/store/useUIStore"
import { useGateways, useDataSource, useCreateDataSource, useUpdateDataSource } from "@/hooks"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function NewDataSourceClientPage({ datasourceId }: { datasourceId?: number }) {
  const { activeTenant } = useUIStore()
  const router = useRouter()
  const { gateways } = useGateways(activeTenant, { is_pager: 0 })
  const { data: existingDs } = useDataSource(activeTenant, datasourceId ?? 0)
  const createMutation = useCreateDataSource(activeTenant)
  const updateMutation = useUpdateDataSource(activeTenant, datasourceId ?? 0)
  const [saving, setSaving] = useState(false)
  const isEdit = !!datasourceId

  const [formData, setFormData] = useState({
    name: "",
    type: "mysql",
    isDual: false,
    dev: { dsn: "", gatewayId: 0 },
    prod: { dsn: "", gatewayId: 0 }
  })

  // Load existing data in edit mode
  useEffect(() => {
    if (existingDs) {
      const prodEnv = existingDs.envs?.find(e => e.env === "prod")
      const devEnv = existingDs.envs?.find(e => e.env === "dev")
      setFormData(prev => ({
        ...prev,
        name: existingDs.name ?? "",
        type: existingDs.type ?? "mysql",
        isDual: existingDs.is_dual ?? false,
        prod: { dsn: prodEnv?.dsn || "", gatewayId: prodEnv?.gateway_id || 0 },
        dev: { dsn: devEnv?.dsn || "", gatewayId: devEnv?.gateway_id || 0 },
      }))
    }
  }, [existingDs])

  // Set default gateway when loaded (only for new)
  useEffect(() => {
    if (!isEdit && gateways.length > 0 && !formData.dev.gatewayId) {
      setFormData(prev => ({
        ...prev,
        dev: { ...prev.dev, gatewayId: gateways[0].id },
        prod: { ...prev.prod, gatewayId: gateways[0].id }
      }))
    }
  }, [gateways])

  const handleSave = async () => {
    if (!formData.name) return toast.error("请输入数据源名称")
    if (!formData.prod.dsn) return toast.error("请输入连接串")
    if (formData.isDual && !formData.dev.dsn) return toast.error("请输入测试环境连接串")

    const envs: { env: 'dev' | 'prod'; dsn: string; gateway_id: number }[] = []
    if (formData.isDual) {
      envs.push({ env: "dev", dsn: formData.dev.dsn, gateway_id: formData.dev.gatewayId })
    }
    envs.push({ env: "prod", dsn: formData.prod.dsn, gateway_id: formData.prod.gatewayId })

    const body = {
      name: formData.name,
      type: formData.type as 'mysql' | 'postgres' | 'sqlserver' | 'starrocks' | 'doris' | 'sqlite',
      is_dual: formData.isDual,
      envs,
    }
    const onSuccess = () => router.push(`/${activeTenant}/data-sources`)

    if (isEdit) {
      updateMutation.mutate(body, { onSuccess })
    } else {
      createMutation.mutate(body, { onSuccess })
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <Link href={`/${activeTenant}/data-sources`}>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{isEdit ? "编辑数据源" : "接入新数据源"}</h1>
            <p className="text-sm text-zinc-500 mt-1 font-medium">{isEdit ? "修改数据源配置，连接串留空则不修改" : "配置多环境数据库连接及对应的网关节点"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-10 px-6 font-bold text-zinc-600">取消</Button>
          <Button onClick={handleSave} disabled={saving} className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? (isEdit ? "保存中..." : "创建中...") : (isEdit ? "保存修改" : "创建数据源")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Basic Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card className="p-6 border-zinc-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
               <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-none text-[10px] font-bold">CONFIG</Badge>
            </div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide mb-6 flex items-center">
              <Info className="w-4 h-4 mr-2 text-blue-500" />
              基础配置
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                  <span>数据源名称</span>
                  <span className="text-[10px] text-zinc-300 font-bold decoration-dotted">REQUIRED</span>
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
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                    <SelectItem value="sqlserver">SQL Server</SelectItem>
                    <SelectItem value="starrocks">StarRocks</SelectItem>
                    <SelectItem value="doris">Doris</SelectItem>
                    <SelectItem value="sqlite">SQLite</SelectItem>
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
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  开启后可分别配置 开发(DEV) 和 生产(PROD) 两个独立节点与地址。
                </p>
              </div>
            </div>
          </Card>

          <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-lg shadow-sm">
             <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                安全与合规
             </h4>
             <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
               OwlAPI 采用<strong>隧道穿透</strong>技术。您的数据库凭据在浏览器端脱敏，仅在网关节点内部加密存储。
             </p>
          </div>
        </div>

        {/* Right: Environment Configs */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* DEV Environment */}
          <Card className="p-6 border-zinc-100 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                  <Globe className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 uppercase">{formData.isDual ? "测试环境 (DEV)" : "配置连接"}</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                    {formData.isDual ? "用于日常开发、调试与推演测试" : "配置数据库连接信息"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">连接串 (DSN)</Label>
                  <Input 
                    placeholder={formData.type === "sqlite" ? "/data/mydb.db" : "user:password@tcp(host:port)/dbname"}
                    value={formData.isDual ? formData.dev.dsn : formData.prod.dsn}
                    onChange={e => formData.isDual 
                      ? setFormData({...formData, dev: {...formData.dev, dsn: e.target.value}})
                      : setFormData({...formData, prod: {...formData.prod, dsn: e.target.value}})
                    }
                    className="h-10 font-mono text-xs border-zinc-200 shadow-none focus:ring-emerald-500/20 bg-white"
                  />
                  {formData.type === "sqlite" && (
                    <p className="text-[10px] text-zinc-400">填写 Gateway 容器内的绝对路径，需通过 Docker volume 挂载宿主机目录</p>
                  )}
               </div>
               <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">绑定网关节点 (Gateway Node)</Label>
                  <Select 
                    value={String(formData.isDual ? formData.dev.gatewayId : formData.prod.gatewayId)} 
                    onValueChange={v => formData.isDual
                      ? setFormData({...formData, dev: {...formData.dev, gatewayId: Number(v)}})
                      : setFormData({...formData, prod: {...formData.prod, gatewayId: Number(v)}})
                    }
                  >
                    <SelectTrigger className="h-12 border-zinc-200 bg-white hover:bg-zinc-50 transition-colors">
                      <SelectValue placeholder="选择网关节点..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {gateways.map(gw => (
                        <SelectItem key={gw.id} value={String(gw.id)} className="focus:bg-zinc-50">
                          <div className="flex items-center">
                            <Server className={cn("w-3.5 h-3.5 mr-2", gw.status === 'online' ? "text-emerald-500" : "text-zinc-300")} />
                            <span className="font-bold">{gw.name}</span>
                            {gw.ip && <span className="ml-2 text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-100 rounded tracking-tight">{gw.ip}</span>}
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
            <Card className="p-6 border-zinc-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 uppercase">生产环境 (PROD)</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">面向线上正式服务的数据库配置</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">连接串 (DSN)</Label>
                    <Input 
                      placeholder={formData.type === "sqlite" ? "/data/mydb.db" : "user:password@tcp(host:port)/dbname"}
                      value={formData.prod.dsn}
                      onChange={e => setFormData({...formData, prod: {...formData.prod, dsn: e.target.value}})}
                      className="h-10 font-mono text-xs border-zinc-200 shadow-none focus:ring-blue-600/20"
                    />
                    {formData.type === "sqlite" && (
                      <p className="text-[10px] text-zinc-400">填写 Gateway 容器内的绝对路径，需通过 Docker volume 挂载宿主机目录</p>
                    )}
                 </div>
                 <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-opacity-70">绑定网关节点 (Gateway Node)</Label>
                    <Select value={String(formData.prod.gatewayId)} onValueChange={v => setFormData({...formData, prod: {...formData.prod, gatewayId: Number(v)}})}>
                      <SelectTrigger className="h-12 border-zinc-200 bg-blue-600/5 hover:bg-blue-600/10 transition-colors">
                        <SelectValue placeholder="选择网关节点..." />
                      </SelectTrigger>
                      <SelectContent>
                        {gateways.map(gw => (
                          <SelectItem key={gw.id} value={String(gw.id)}>
                            <div className="flex items-center">
                              <Server className={cn("w-3.5 h-3.5 mr-2", gw.status === 'online' ? "text-blue-500" : "text-zinc-300")} />
                              <span className="font-bold">{gw.name}</span>
                              {gw.ip && <span className="ml-2 text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-100 rounded tracking-tight">{gw.ip}</span>}
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
            <div className="p-10 border-2 border-dashed border-zinc-100 rounded-lg flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                <ArrowLeft className="w-6 h-6 text-zinc-200 rotate-180" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-400">单环境模式</p>
                <p className="text-[10px] text-zinc-300 max-w-[240px] mt-1 leading-relaxed">
                  如需分别配置测试和生产环境，请在左侧开启"多环境支持"。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
