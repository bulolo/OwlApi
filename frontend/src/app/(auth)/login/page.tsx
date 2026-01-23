"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Hexagon, ArrowRight, ShieldCheck, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      router.push("/dashboard")
    }, 800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 selection:bg-blue-100">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] p-6 lg:p-0"
      >
        <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-xl shadow-zinc-200/50 space-y-8">
          {/* Logo & Info */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">账号邮件</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input
                    type="email"
                    placeholder="admin@corp.com"
                    required
                    className="pl-10 h-11 bg-zinc-50 border-zinc-200 rounded-md focus:bg-white text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">访问秘钥</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    className="pl-10 h-11 bg-zinc-50 border-zinc-200 rounded-md focus:bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            <Button
              disabled={isLoading}
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-xs font-bold shadow-sm group transition-all mt-4"
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
            <div className="flex items-center space-x-1.5 text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>SSL 256 位加密保护</span>
            </div>
            <span className="text-[9px] text-zinc-300 font-bold uppercase cursor-pointer hover:text-zinc-600">忘记密码?</span>
          </div>
        </div>

        <p className="text-center mt-8 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
          专为大规模构建 • SQL 驱动
        </p>
      </motion.div>
    </div>
  )
}
