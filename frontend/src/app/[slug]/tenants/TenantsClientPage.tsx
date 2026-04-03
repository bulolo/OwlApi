"use client"

import { useState, useEffect } from "react"
import { 
  Building2, 
  Plus, 
  Search, 
  Shield, 
  Activity,
  Clock,
  ChevronRight,
  Settings,
  Globe
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { motion } from "framer-motion"
import { useUIStore } from "@/store/useUIStore"
import { useRouter } from "next/navigation"
import { useTenantStore } from "@/store/useTenantStore"

import TenantRegisterForm from "./TenantRegisterForm"

export default function TenantsClientPage() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [search, setSearch] = useState("")
  const { setViewContext, setActiveTenant } = useUIStore()
  const { tenants, fetchTenants, markTenantAsRecent } = useTenantStore()
  const router = useRouter()

  useEffect(() => { fetchTenants() }, [])

  if (isRegistering) {
    return <TenantRegisterForm onCancel={() => setIsRegistering(false)} />
  }

  const filteredTenants = tenants.filter(t => 
    (t.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (t.slug || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.id || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-zinc-400" />
            租户管理 (Tenant Management)
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">查看并管理全站所有企业租户、订阅状态及资源使用情况。</p>
        </div>
        <Button 
          onClick={() => setIsRegistering(true)}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          开通新租户
        </Button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="累计企业租户" value="12" subValue="+2 本月" icon={Building2} />
        <StatsCard title="本月 API 调用总量" value="1.2M" subValue="+12.5% 环比" icon={Activity} />
        <StatsCard title="在线网关节点" value="48" subValue="2 节点异常" icon={Shield} />
      </div>

      {/* Filters & Table Placeholder */}
      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="搜索租户名称、域名或 ID..." 
              className="pl-9 h-9 text-xs border-zinc-200 bg-white"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-9 text-xs font-bold border-zinc-200">
              全部状态
            </Button>
            <Button variant="outline" className="h-9 text-xs font-bold border-zinc-200">
              数据导出
            </Button>
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {filteredTenants.map((tenant, i) => (

            <motion.div 
              key={tenant.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 hover:bg-zinc-50/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200 group-hover:bg-white transition-colors">
                     <Building2 className="w-5 h-5 text-zinc-400 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-900">{tenant.name}</h3>
                      <Badge variant="secondary" className="text-[9px] h-4 font-black uppercase tracking-tighter bg-zinc-100 text-zinc-500">
                        {tenant.id}
                      </Badge>
                      <Badge className={cn(
                        "text-[9px] h-4 font-black uppercase",
                        tenant.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {tenant.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" /> owlapi.cn/{tenant.slug}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-200" />
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 开通于 {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-12 text-center">
                  <div className="hidden md:block">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">订阅计划</p>
                    <p className="text-xs font-bold text-zinc-700">{tenant.plan || 'Free'}</p>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <Button 
                      variant="ghost" 
                      className="h-8 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        setViewContext('TENANT');
                        setActiveTenant(tenant.slug);
                        markTenantAsRecent(tenant.id);
                        router.push(`/${tenant.slug}/overview`);
                      }}
                    >
                      进入管理
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/30 text-center">
           <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">
             显示 {filteredTenants.length} 个租户，共 {tenants.length} 个
           </p>
        </div>
      </div>
    </div>
  )
}

function StatsCard({ title, value, subValue, icon: Icon }: any) {
  return (
    <Card className="border-zinc-200/60 shadow-sm">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</h3>
            <span className="text-[10px] font-bold text-emerald-600">{subValue}</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400">
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  )
}
