"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Hexagon, ArrowRight, ShieldCheck, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUIStore } from "@/store/useUIStore"
import { useTenantStore } from "@/store/useTenantStore"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useUIStore()
  const { fetchTenants } = useTenantStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [remember, setRemember] = useState(false)

  // Restore saved email only (never store password)
  useEffect(() => {
    const savedEmail = localStorage.getItem('owlapi_remember_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRemember(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      if (remember) {
        localStorage.setItem('owlapi_remember_email', email)
      } else {
        localStorage.removeItem('owlapi_remember_email')
      }
      const res = await login(email, password)
      await fetchTenants()
      const redirect = searchParams.get('redirect')
      if (redirect) {
        router.push(redirect)
      } else {
        const slug = res.tenant?.slug || "default"
        router.push(`/${slug}/overview`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "登录失败，请检查账号密码"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 selection:bg-blue-100">
      <div className="w-full max-w-[400px] p-6 lg:p-0">
        <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-sm space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">OwlAPI 云平台</h1>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">企业级 SQL-API 网关</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="login-email" className="text-[10px] font-bold text-zinc-500 uppercase px-1">账号邮件</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@corp.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-lg focus:bg-white text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="login-password" className="text-[10px] font-bold text-zinc-500 uppercase px-1">访问秘钥</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-lg focus:bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-[11px] text-zinc-500 font-medium">记住账号</span>
            </label>

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
                  <span>正在挂载环境...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <span>登入控制台</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>SSL 256 位加密保护</span>
            </div>
            <span className="text-[10px] text-zinc-300 font-bold uppercase cursor-pointer hover:text-zinc-600">忘记密码?</span>
          </div>
        </div>

        <p className="text-center mt-8 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
          专为大规模构建 • SQL 驱动
        </p>
      </div>
    </div>
  )
}
