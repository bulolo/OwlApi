"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Hexagon, ArrowRight, ShieldCheck, Mail, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/useAuthStore"
import { STORAGE_KEYS } from "@/lib/constants"
import { useQueryClient } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { apiGetPlatformSettings, getToken } from "@/lib/api-client"

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
  const { login } = useAuthStore()
  const qc = useQueryClient()
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: apiGetPlatformSettings,
    staleTime: 5 * 60 * 1000,
  })
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [remember, setRemember] = useState(false)

  // If already authenticated, skip the login page entirely
  useEffect(() => {
    if (getToken()) {
      const redirect = searchParams.get('redirect')
      router.replace(redirect || '/')
    }
  }, [router, searchParams])

  // Restore saved email only (never store password)
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL)
    if (savedEmail) {
      setEmail(savedEmail)
      setRemember(true)
    }
  }, [])

  const fillDemo = () => {
    setEmail("admin@owlapi.cn")
    setPassword("admin123")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      if (remember) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, email)
      } else {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL)
      }
      const res = await login(email, password)
      qc.invalidateQueries({ queryKey: ["tenants"] })
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 selection:bg-primary/20">
      <div className="w-full max-w-[400px] p-6 lg:p-0">
        <div className="bg-white border border-border rounded-lg p-8 shadow-card space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-lg font-black text-foreground uppercase tracking-tight">OwlAPI 云平台</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">企业级 SQL-API 网关</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="login-email" className="text-2xs font-bold text-muted-foreground uppercase px-1">账号邮件</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@corp.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 bg-zinc-50 border-border rounded-lg focus:bg-white text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="login-password" className="text-2xs font-bold text-muted-foreground uppercase px-1">访问秘钥</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-10 bg-zinc-50 border-border rounded-lg focus:bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground font-medium">记住账号</span>
            </label>

            {error && (
              <p className="text-xs text-red-500 font-medium px-1" role="alert">{error}</p>
            )}

            <Button
              disabled={isLoading}
              className="w-full h-10 rounded-lg text-xs font-bold shadow-sm group transition-all mt-4"
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

            <button
              type="button"
              onClick={fillDemo}
              className="w-full text-center text-2xs text-zinc-300 hover:text-muted-foreground transition-colors font-mono"
            >
              演示: admin@owlapi.cn · admin123
            </button>
          </form>

          <div className="pt-6 border-t border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-2xs text-muted-foreground font-bold uppercase tracking-tight">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>SSL 256 位加密保护</span>
              </div>
              <span className="text-2xs text-zinc-300 font-bold uppercase cursor-pointer hover:text-zinc-600">忘记密码?</span>
            </div>
            {platformSettings?.allow_self_register && (
              <p className="text-center text-xs text-muted-foreground">
                没有账号？
                <Link href="/register" className="font-bold text-primary hover:text-primary/90 ml-1">申请注册</Link>
              </p>
            )}
          </div>
        </div>

        <p className="text-center mt-8 text-muted-foreground text-2xs font-bold uppercase tracking-[0.2em] opacity-50">
          专为大规模构建 • SQL 驱动
        </p>
      </div>
    </div>
  )
}
