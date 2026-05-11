"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Hexagon, ArrowRight, Mail, Lock, User, Building2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRegister } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const qc = useQueryClient()
  const [form, setForm] = useState({ email: "", name: "", password: "", tenant_name: "", tenant_slug: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm(prev => {
      const next = { ...prev, [k]: val }
      // auto-derive slug from tenant_name
      if (k === "tenant_name") {
        next.tenant_slug = val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const res = await apiRegister(form)
      await qc.invalidateQueries({ queryKey: ["tenants"] })
      const slug = res.tenant?.slug || form.tenant_slug || "default"
      router.push(`/${slug}/overview`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "注册失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 selection:bg-blue-100">
      <div className="w-full max-w-[420px] p-6 lg:p-0">
        <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-sm space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">创建组织</h1>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">注册 OwlAPI 云平台</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input type="email" required placeholder="admin@corp.com" value={form.email} onChange={set("email")}
                    className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-lg focus:bg-white text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">姓名</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input required placeholder="张三" value={form.name} onChange={set("name")}
                    className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-lg focus:bg-white text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input type="password" required placeholder="••••••••" value={form.password} onChange={set("password")}
                    className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-lg focus:bg-white text-sm" />
                </div>
              </div>

              <div className="h-px bg-zinc-100" />

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">组织名称</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input required placeholder="我的公司" value={form.tenant_name} onChange={set("tenant_name")}
                    className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-lg focus:bg-white text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">组织标识</label>
                <Input required placeholder="my-company" value={form.tenant_slug} onChange={set("tenant_slug")}
                  className="h-10 bg-zinc-50 border-zinc-200 rounded-lg focus:bg-white text-sm font-mono" />
                <p className="text-[10px] text-zinc-400 px-1">用于 URL，只允许小写字母、数字和连字符</p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-medium px-1" role="alert">{error}</p>
            )}

            <Button
              disabled={isLoading}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm group transition-all mt-4"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>正在创建组织...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <span>创建并进入控制台</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-zinc-100 text-center">
            <span className="text-xs text-zinc-400">已有账号？</span>
            <Link href="/login" className="text-xs font-bold text-blue-600 hover:text-blue-700 ml-1">返回登录</Link>
          </div>
        </div>

        <p className="text-center mt-8 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
          专为大规模构建 • SQL 驱动
        </p>
      </div>
    </div>
  )
}
