"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { apiCreateTenant } from "@/lib/api-client"
import { useUIStore } from "@/store/useUIStore"
import { useTenantStore } from "@/store/useTenantStore"

interface TenantRegisterFormProps {
  onCancel: () => void
  onSuccess?: () => void
}

export default function TenantRegisterForm({ onCancel, onSuccess }: TenantRegisterFormProps) {
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [tenantId, setTenantId] = useState("")
  const { user } = useUIStore()
  const { fetchTenants } = useTenantStore()
  const [formData, setFormData] = useState({
    companyName: "",
    slug: "",
    plan: "Free",
    adminEmail: "",
    region: "shanghai"
  })

  return (
    <div className="max-w-3xl mx-auto py-4 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-zinc-100"
          onClick={onCancel}
        >
          <ArrowLeft className="w-5 h-5 text-zinc-500" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            开通新租户 (Tenant Onboarding)
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">
            为新的合作伙伴或企业客户分配独立的资源空间与访问路径。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Progress Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="flex flex-col gap-6">
            <StepIndicator number={1} title="基本信息" active={step >= 1} />
            <StepIndicator number={2} title="套餐与规模" active={step >= 2} />
            <StepIndicator number={3} title="完成开通" active={step >= 3} />
          </div>
          
          <div className="pt-6 border-t border-zinc-100">
             <div className="bg-blue-50 rounded-lg p-4">
               <ShieldCheck className="w-5 h-5 text-blue-600 mb-2" />
               <p className="text-[10px] font-bold text-blue-900 uppercase">安全隔离保证</p>
               <p className="text-[10px] text-blue-700 mt-1 leading-normal">
                 每个租户通过唯一的 Tenant ID 在统一数据库中实现逻辑隔离，确保数据访问的绝对安全性。
               </p>
             </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          <Card className="p-8 border-zinc-200/60 shadow-lg shadow-zinc-200/20">
            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">公司/企业名称</Label>
                  <Input 
                    placeholder="e.g. 阿里巴巴 (中国) 网络技术有限公司" 
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="h-11 bg-zinc-50/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">专属访问路径</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-400">owlapi.cn/</span>
                    <Input 
                      placeholder="aliyun" 
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value})}
                      className="h-11 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400">初始管理员邮箱</Label>
                  <Input 
                    type="email"
                    placeholder="it-admin@company.com" 
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                    className="h-11 bg-zinc-50/50"
                  />
                </div>

                <Button 
                  onClick={() => setStep(2)}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md"
                >
                  下一步: 选择订阅套餐
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase text-zinc-400">选择服务等级</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <PlanOption 
                      active={formData.plan === 'Free'} 
                      onClick={() => setFormData({...formData, plan: 'Free'})}
                      title="Free" 
                      desc="适合个人开发者和小型团队试用"
                    />
                    <PlanOption 
                      active={formData.plan === 'Pro'} 
                      onClick={() => setFormData({...formData, plan: 'Pro'})}
                      title="Pro" 
                      desc="支持私有网关节点部署与高级审计"
                    />
                    <PlanOption 
                      active={formData.plan === 'Enterprise'} 
                      onClick={() => setFormData({...formData, plan: 'Enterprise'})}
                      title="Enterprise" 
                      desc="独占集群、SSO 集成及 7x24 服务"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 font-bold">返回修改</Button>
                  <Button 
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true)
                      setError("")
                      try {
                        const tenant = await apiCreateTenant({
                          name: formData.companyName,
                          slug: formData.slug,
                          plan: formData.plan as any,
                          user_id: user?.id || "",
                        })
                        setTenantId(tenant.id || "")
                        await fetchTenants()
                        setStep(3)
                      } catch (err: any) {
                        setError(err?.message || "创建失败")
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className="flex-[2] h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                  >
                    {loading ? "创建中..." : "确认并初始化资源"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">租户开通成功!</h3>
                  <p className="text-sm text-zinc-500 mt-2">
                    系统已自动为您完成租户 ID 分配与默认工作区逻辑隔离。<br/>
                    管理员激活邮件已发送至 <strong>{formData.adminEmail}</strong>
                  </p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-left">
                   <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-zinc-400">专属访问 URL:</span>
                      <span className="font-mono font-bold text-blue-600">owlapi.cn/{formData.slug}</span>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">租户识别码 (Tenant ID):</span>
                      <span className="font-mono font-bold text-zinc-900 uppercase">{tenantId}</span>
                   </div>
                </div>
                <Button 
                  onClick={() => {
                    if (onSuccess) onSuccess()
                    else onCancel()
                  }}
                  className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-bold"
                >
                  返回列表 (Done)
                </Button>
              </motion.div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ number, title, active }: { number: number; title: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${active ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-zinc-200 text-zinc-400"}`}>
        {number}
      </div>
      <span className={`text-[11px] font-bold ${active ? "text-zinc-900" : "text-zinc-400"}`}>{title}</span>
    </div>
  )
}

function PlanOption({ title, desc, active, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${active ? "border-blue-500 bg-blue-50/30 shadow-sm" : "border-zinc-100 hover:border-zinc-200"}`}
    >
       <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-sm text-zinc-900">{title}</p>
          {active && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
       </div>
       <p className="text-xs text-zinc-500">{desc}</p>
    </div>
  )
}
