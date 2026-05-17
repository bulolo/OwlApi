"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react"
import { apiCreateTenant } from "@/lib/api-client"
import { useAdminMutation } from "@/hooks"
import { useIsClient } from "@/hooks/useIsClient"

interface TenantRegisterFormProps {
  onCancel: () => void
  onSuccess?: () => void
}

export default function TenantRegisterForm({ onCancel, onSuccess }: TenantRegisterFormProps) {
  const isClient = useIsClient()
  const appHost = isClient ? window.location.host : ''
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [tenantId, setTenantId] = useState("")
  const [formData, setFormData] = useState({
    companyName: "",
    slug: "",
    plan: "Free",
    adminEmail: "",
    region: "shanghai"
  })

  const createMutation = useAdminMutation({
    mutationFn: () => apiCreateTenant({
      name: formData.companyName,
      slug: formData.slug,
      plan: formData.plan as 'Free' | 'Pro' | 'Enterprise',
    }),
    invalidateKeys: [["tenants"]],
    onSuccess: (tenant) => {
      setTenantId(String(tenant.id || ""))
      setStep(3)
    },
    onError: (err) => {
      setError((err as Error)?.message || "创建失败")
    },
  })

  return (
    <div className="max-w-3xl mx-auto py-4 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg hover:bg-zinc-100"
          onClick={onCancel}
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            开通新组织
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
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

          <div className="pt-6 border-t border-border-subtle">
             <div className="bg-primary/10 rounded-lg p-4">
               <ShieldCheck className="w-5 h-5 text-primary mb-2" />
               <p className="text-2xs font-bold text-primary uppercase">安全隔离保证</p>
               <p className="text-2xs text-primary mt-1 leading-normal">
                 每个组织通过唯一的 Tenant ID 在统一数据库中实现逻辑隔离，确保数据访问的绝对安全性。
               </p>
             </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          <Card className="p-8 border-border-subtle shadow-card">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">公司/企业名称</Label>
                  <Input
                    placeholder="e.g. 阿里巴巴 (中国) 网络技术有限公司"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="h-9 bg-zinc-50/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">专属访问路径</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">{appHost}/</span>
                    <Input
                      placeholder="aliyun"
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value})}
                      className="h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">初始管理员邮箱</Label>
                  <Input
                    type="email"
                    placeholder="it-admin@company.com"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                    className="h-9 bg-zinc-50/50"
                  />
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full h-9 text-xs font-bold rounded-lg shadow-sm"
                >
                  下一步: 选择订阅套餐
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">选择服务等级</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <PlanOption
                      active={formData.plan === 'Demo'}
                      onClick={() => setFormData({...formData, plan: 'Demo'})}
                      title="Demo"
                      desc="演示模式，只读访问，写入操作受限"
                    />
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
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-9 text-xs font-bold">返回修改</Button>
                  <Button
                    disabled={createMutation.isPending}
                    onClick={() => {
                      setError("")
                      createMutation.mutate(undefined)
                    }}
                    className="flex-[2] h-9 text-xs font-bold rounded-lg"
                  >
                    {createMutation.isPending ? "创建中..." : "确认并初始化资源"}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-6 space-y-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">组织开通成功!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    系统已自动为您完成组织 ID 分配与默认工作区逻辑隔离。<br/>
                    管理员激活邮件已发送至 <strong>{formData.adminEmail}</strong>
                  </p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-lg border border-dashed border-border text-left">
                   <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">专属访问 URL:</span>
                      <span className="font-mono font-bold text-primary">{appHost}/{formData.slug}</span>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">组织识别码 (Tenant ID):</span>
                      <span className="font-mono font-bold text-foreground uppercase">{tenantId}</span>
                   </div>
                </div>
                <Button
                  onClick={() => {
                    if (onSuccess) onSuccess()
                    else onCancel()
                  }}
                  className="w-full h-9 text-xs font-bold"
                >
                  返回列表
                </Button>
              </div>
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
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-2xs font-black border-2 ${active ? "bg-primary border-primary text-white" : "bg-white border-border text-muted-foreground"}`}>
        {number}
      </div>
      <span className={`text-xs font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}>{title}</span>
    </div>
  )
}

function PlanOption({ title, desc, active, onClick }: { title: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${active ? "border-primary bg-primary/10 shadow-sm" : "border-border-subtle hover:border-border"}`}
    >
       <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-sm text-foreground">{title}</p>
          {active && <CheckCircle2 className="w-4 h-4 text-primary" />}
       </div>
       <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}
