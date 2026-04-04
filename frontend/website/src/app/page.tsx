"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Database, Globe, Shield, Zap, ArrowRight, Terminal, Layers, Cpu, Github, Check } from "lucide-react"

/* ─── Animations ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ 
    opacity: 1, 
    y: 0, 
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] } 
  }),
}

const glowPulse = {
  initial: { opacity: 0.4, scale: 0.8 },
  animate: { 
    opacity: [0.4, 0.8, 0.4], 
    scale: [0.8, 1.2, 0.8], 
    transition: { duration: 8, repeat: Infinity, ease: "easeInOut" }
  }
}

/* ─── Header ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'}`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className={`flex h-14 items-center justify-between rounded-full border border-[var(--color-border)] px-6 transition-all duration-500 ${
          scrolled ? 'bg-black/60 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl' : 'bg-transparent backdrop-blur-md'
        }`}>
          <div className="flex items-center gap-2.5 font-bold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-brand)] to-purple-500 text-xs text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">🦉</div>
            <span className="text-white">OwlApi</span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium text-[var(--color-muted-foreground)] md:flex">
            <a href="#features" className="transition-colors hover:text-white">特性</a>
            <a href="#architecture" className="transition-colors hover:text-white">架构</a>
            <a href="#quickstart" className="transition-colors hover:text-white">快速开始</a>
          </div>
          <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener"
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95">
            <Github size={16} /> GitHub
          </a>
        </div>
      </div>
    </motion.header>
  )
}

/* ─── Hero Section ─── */
function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden pt-32 pb-20">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[var(--color-brand)] opacity-[0.15] blur-[120px] rounded-[100%] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] bg-purple-600 opacity-[0.1] blur-[100px] rounded-[100%] pointer-events-none mix-blend-screen" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          下一代 SQL to API 网关 v0.1
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }}
          className="mx-auto mb-6 max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl lg:text-8xl">
          编写 SQL。 <br/>
          <span className="text-gradient-brand">即刻生成 API。</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-[var(--color-muted-foreground)] md:text-xl md:leading-relaxed">
          企业级智能网关平台。打破内网边界，让任意数据库安全暴露为标准 RESTful API。
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href="#quickstart"
            className="group relative flex h-12 items-center gap-2 overflow-hidden rounded-full bg-white px-8 text-sm font-semibold text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] active:scale-95">
            快速开始 <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener"
            className="flex h-12 items-center gap-2 rounded-full border border-white/20 bg-black/50 px-8 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/40 active:scale-95">
            <Terminal size={16} /> 查看源码
          </a>
        </motion.div>

        {/* Dashboard Mockup Component */}
        <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          className="relative mx-auto mt-24 max-w-5xl perspective-1000">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-indigo-500/30 to-purple-500/10 blur-xl opacity-50" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a]/90 shadow-2xl backdrop-blur-xl overflow-hidden transform-gpu rotate-x-12 scale-[0.98] transition-transform duration-700 hover:rotate-x-0 hover:scale-100">
            {/* Mock Header */}
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="mx-auto flex h-6 w-64 items-center justify-center rounded-md bg-white/5 text-[10px] text-white/50">
                owlapi.local / endpoints
              </div>
            </div>
            {/* Mock Body */}
            <div className="flex h-[320px] md:h-[480px]">
              {/* Sidebar */}
              <div className="w-48 hidden border-r border-white/5 bg-white/[0.01] p-4 md:flex flex-col gap-2">
                <div className="h-8 rounded-md bg-indigo-500/20 text-indigo-300 text-xs flex items-center px-3 font-medium">✨ API Endpoints</div>
                <div className="h-8 rounded-md bg-transparent text-white/40 text-xs flex items-center px-3 hover:bg-white/5 transition">🗄️ Databases</div>
                <div className="h-8 rounded-md bg-transparent text-white/40 text-xs flex items-center px-3 hover:bg-white/5 transition">👥 Tenants</div>
              </div>
              {/* Main Area */}
              <div className="flex-1 p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-semibold text-lg">GET /api/v1/users</h3>
                  <div className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs">Active</div>
                </div>
                <div className="flex-1 rounded-lg border border-white/5 bg-[#050505] p-4 font-mono text-sm overflow-hidden relative group">
                  <div className="text-indigo-400 mb-2">// 自动映射查询参数</div>
                  <div className="text-white/80">
                    <span className="text-pink-400">SELECT</span> id, username, email, created_at<br/>
                    <span className="text-pink-400">FROM</span> public.users<br/>
                    <span className="text-pink-400">WHERE</span> status = <span className="text-emerald-300">@status</span><br/>
                    <span className="text-pink-400">LIMIT</span> <span className="text-emerald-300">@limit</span>;
                  </div>
                  {/* Fake Run Button */}
                  <div className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer">
                    <Zap size={12}/> Run Query
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Bento Grid Features ─── */
function BentoFeatures() {
  return (
    <section id="features" className="relative py-32 z-10">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-20">
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight text-white md:text-5xl mb-4">
            为现代数据访问<br className="hidden md:block"/> <span className="text-gradient">打造的强大工具。</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="max-w-2xl text-[var(--color-muted-foreground)] text-lg">
            专为企业级架构而生。从 SQL 编写到 API 发布，无缝管理数据接口的全生命周期。
          </motion.p>
        </motion.div>

        {/* Bento Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[280px]">
          {/* Card 1: Large */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 transition-colors hover:border-white/20">
            <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
            <div className="flex flex-col h-full justify-between relative z-10">
              <div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30">
                  <Zap size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">SQL to RESTful API</h3>
                <p className="text-[var(--color-muted-foreground)] max-w-sm">编写 SQL 查询，映射参数，即可瞬间发布。生产级接口零代码搭建，拒绝繁琐的样板代码。</p>
              </div>
              {/* Graphic element */}
              <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-64 bg-[#050505] rounded-tl-2xl border-t border-l border-white/10 shadow-2xl p-4 hidden sm:block">
                <div className="text-xs text-white/50 mb-2 border-b border-white/10 pb-2 flex items-center justify-between"><span>endpoints.json</span> <Check size={12} className="text-emerald-400"/></div>
                <pre className="text-[10px] text-indigo-300 font-mono leading-relaxed">
{`{
  "path": "/users",
  "method": "GET",
  "sql": "SELECT * FROM users",
  "auth": "jwt",
  "cache": "60s"
}`}
                </pre>
              </div>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 group transition-colors hover:border-white/20">
            <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-purple-500/20 via-transparent to-transparent pointer-events-none" />
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30">
              <Globe size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">混合云网关</h3>
            <p className="text-[var(--color-muted-foreground)] text-sm leading-relaxed">
              Gateway Runner 部署于 IDC 或边缘节点。通过 gRPC 加密隧道建立安全连接，无需暴露公网 IP。
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 group transition-colors hover:border-white/20">
            <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-bl from-emerald-500/20 via-transparent to-transparent pointer-events-none" />
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">多租户隔离</h3>
            <p className="text-[var(--color-muted-foreground)] text-sm leading-relaxed">
              原生三级 RBAC 权限体系。在数据层、连接层和路由层实现全面和彻底的安全隔离。
            </p>
          </motion.div>

          {/* Card 4: Wide */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 group transition-colors hover:border-white/20 flex flex-col md:flex-row gap-6 items-center">
            <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="flex-1">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">全数据库支持</h3>
              <p className="text-[var(--color-muted-foreground)] text-sm leading-relaxed mb-4 max-w-sm">
                统一连接 MySQL、PostgreSQL、Oracle、SQLite 等。一个控制平台即可管理所有数据源。
              </p>
            </div>
            <div className="flex-1 flex justify-end w-full">
              {/* Graphic database stack */}
              <div className="flex flex-col gap-2 w-full max-w-[200px]">
                {['PostgreSQL', 'MySQL', 'Oracle DB'].map((db, i) => (
                  <div key={db} className="h-10 rounded-lg bg-white/5 border border-white/10 flex items-center px-4 gap-2 text-xs text-white/70">
                    <Database size={14} className="text-blue-400" /> {db}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Card 5 */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 group transition-colors hover:border-white/20">
            <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-orange-500/20 via-transparent to-transparent pointer-events-none" />
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30">
              <Cpu size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">边缘节点优化</h3>
            <p className="text-[var(--color-muted-foreground)] text-sm leading-relaxed">
              采用 Go 语言构建。单二进制文件部署，内存占用极低，同时完美适配树莓派等边缘设备。
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── Architecture View ─── */
function Architecture() {
  return (
    <section id="architecture" className="relative py-32 overflow-hidden">
      {/* Background Separator Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white md:text-5xl mb-4">系统架构与数据流</h2>
          <p className="text-[var(--color-muted-foreground)] max-w-2xl mx-auto">控制面与执行网关完全解耦，确保绝对的安全性与极致性能。</p>
        </div>

        {/* Visual Diagram */}
        <div className="relative mx-auto max-w-4xl pt-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            {/* Control Plane Block */}
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="w-full md:w-64 p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative group">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 border border-indigo-500/30">
                  <Layers size={28} className="text-indigo-400"/>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Control Plane</h4>
                <div className="text-xs text-white/50 mb-3 bg-white/5 px-2 py-1 rounded">Go + Gin</div>
                <p className="text-xs text-[var(--color-muted-foreground)]">API 路由、鉴权中心与多租户管理系统。</p>
              </div>
            </motion.div>

            {/* Connecting Pipe */}
            <div className="hidden md:flex flex-1 items-center justify-center relative h-32">
              <div className="absolute left-0 right-0 h-[2px] bg-white/10" />
              <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 w-1/2 animate-pulse [animation-duration:2s]" />
              <div className="relative z-10 bg-[#050505] px-4 text-xs font-mono text-white/40 border border-white/10 rounded-full py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                gRPC Reverse Tunnel
              </div>
            </div>

            {/* Default Vertical space for mobile */}
            <div className="md:hidden flex h-16 items-center justify-center">
               <div className="w-[1px] h-full bg-gradient-to-b from-indigo-500 to-emerald-500" />
            </div>

            {/* Gateway Runner Block */}
            <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="w-full md:w-64 p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative group">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30">
                  <Terminal size={28} className="text-emerald-400"/>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Gateway Runner</h4>
                <div className="text-xs text-white/50 mb-3 bg-white/5 px-2 py-1 rounded">Intranet Deploy</div>
                <p className="text-xs text-[var(--color-muted-foreground)]">在内网环境中安全执行 SQL，不暴露数据库密码等敏感信息，仅回传运行结果及报文。</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── CTA & Terminal ─── */
function CTA() {
  return (
    <section id="quickstart" className="relative py-32 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_center,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />
      <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
        <h2 className="text-4xl font-black text-white md:text-6xl mb-6 tracking-tight">秒级部署启动</h2>
        <p className="text-lg text-[var(--color-muted-foreground)] mb-10 max-w-xl mx-auto">
          一条命令即可启动全栈环境。完全开源，基于 MIT 协议构建您的企业级接口网关。
        </p>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} 
          className="mx-auto max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-left mb-12">
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
             <div className="flex gap-1.5">
               <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
               <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
               <div className="h-3 w-3 rounded-full bg-[#28c840]" />
             </div>
             <div className="text-xs text-white/40 ml-2 font-mono">bash</div>
          </div>
          <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto text-[var(--color-foreground)]">
             <div className="text-white/40 mb-2"># 通过 git clone 源码并启动全栈开发环境</div>
             <div><span className="text-emerald-400">❯</span> <span className="text-indigo-300">git</span> clone https://github.com/bulolo/owlapi.git</div>
             <div><span className="text-emerald-400">❯</span> <span className="text-indigo-300">cd</span> owlapi && make dev-up</div>
             <br/>
             <div className="text-emerald-400"><span className="text-white/50">✔</span> Admin Console  → http://localhost:8000</div>
             <div className="text-emerald-400"><span className="text-white/50">✔</span> API Service    → http://localhost:3000</div>
          </div>
        </motion.div>

        <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:bg-neutral-100 hover:shadow-[0_0_50px_rgba(255,255,255,0.4)]">
          <Github className="w-5 h-5"/> 前往 GitHub
        </a>
      </div>
    </section>
  )
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black pt-12 pb-8">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
           <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-[var(--color-brand)] to-purple-500 text-[10px] text-white">🦉</div>
           <span className="text-white font-semibold tracking-tight">OwlApi</span>
        </div>
        <div className="text-xs text-[var(--color-muted-foreground)]">
          &copy; {new Date().getFullYear()} OwlApi 贡献者。基于 MIT 协议开源。
        </div>
      </div>
    </footer>
  )
}

/* ─── Main Page ─── */
export default function Home() {
  return (
    <main className="bg-black min-h-screen selection:bg-indigo-500/30 selection:text-white">
      <Nav />
      <Hero />
      <BentoFeatures />
      <Architecture />
      <CTA />
      <Footer />
    </main>
  )
}
