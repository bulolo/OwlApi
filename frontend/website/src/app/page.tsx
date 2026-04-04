"use client"

import { Database, Globe, Shield, Zap, ArrowRight, Terminal, Layers, Cpu, Github, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" as const } }),
}

/* ─── Nav ─── */
function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mt-4 flex h-14 items-center justify-between rounded-2xl border border-[var(--border)] bg-black/60 px-6 backdrop-blur-2xl">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-500 text-xs">🦉</div>
            OwlApi
          </div>
          <div className="hidden items-center gap-8 text-[13px] text-[var(--text-secondary)] md:flex">
            <a href="#features" className="transition hover:text-white">特性</a>
            <a href="#architecture" className="transition hover:text-white">架构</a>
            <a href="#quickstart" className="transition hover:text-white">快速开始</a>
          </div>
          <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener"
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-3.5 py-1.5 text-[13px] font-medium transition hover:bg-white/[0.12]">
            <Github size={14} /> GitHub
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[var(--accent)] opacity-[0.04] blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[600px] w-[600px] translate-x-1/4 translate-y-1/4 rounded-full bg-purple-600 opacity-[0.03] blur-[120px]" />

      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-24 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-white/[0.03] px-5 py-2 text-[13px] text-[var(--text-secondary)] backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          开源免费 · MIT License
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
          className="mb-8 text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-tight">
          编写 SQL，
          <br />
          <span className="bg-gradient-to-r from-[var(--accent)] via-purple-400 to-pink-400 bg-clip-text text-transparent">
            即刻生成 API
          </span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }}
          className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
          OwlApi 是企业级 SQL to API 智能网关平台。
          <br className="hidden md:block" />
          混合云网关打破内网边界，让任意数据库安全暴露为标准 RESTful API。
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href="#quickstart"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--accent)] to-purple-500 px-10 py-4 text-[15px] font-semibold text-white shadow-[0_0_40px_var(--glow)] transition-all hover:shadow-[0_0_60px_var(--glow)]">
            <span className="relative z-10 flex items-center gap-2">
              快速开始 <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </span>
          </a>
          <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener"
            className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/[0.02] px-10 py-4 text-[15px] font-semibold backdrop-blur-sm transition hover:border-[var(--border-hover)] hover:bg-white/[0.05]">
            查看源码 <ChevronRight size={16} />
          </a>
        </motion.div>

        {/* Terminal */}
        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
          className="mx-auto mt-20 max-w-3xl">
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[#0a0a0a] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="ml-3 text-xs text-[var(--text-secondary)]">Terminal — owlapi</span>
            </div>
            <div className="p-6 md:p-8">
              <pre className="text-[13px] leading-7 md:text-sm">
                <code>
                  <span className="text-[var(--text-secondary)]"># 一条命令启动全栈环境</span>{"\n"}
                  <span className="text-emerald-400">❯</span> <span className="text-[var(--accent)]">git clone</span> https://github.com/bulolo/owlapi.git{"\n"}
                  <span className="text-emerald-400">❯</span> <span className="text-[var(--accent)]">cd</span> owlapi && <span className="text-[var(--accent)]">make</span> dev-up{"\n\n"}
                  <span className="text-emerald-400">✓</span> <span className="text-[var(--text-secondary)]">Admin 控制台</span>  → http://localhost:8000{"\n"}
                  <span className="text-emerald-400">✓</span> <span className="text-[var(--text-secondary)]">API 服务</span>      → http://localhost:3000{"\n"}
                  <span className="text-emerald-400">✓</span> <span className="text-[var(--text-secondary)]">文档站点</span>      → http://localhost:8001{"\n"}
                  <span className="text-emerald-400">✓</span> <span className="text-[var(--text-secondary)]">官方网站</span>      → http://localhost:8002
                </code>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Features ─── */
const features = [
  { icon: <Zap size={22} />, title: "SQL to API", desc: "编写 SQL 查询，一键发布为标准 RESTful API。支持参数映射、版本控制，零代码即可上线数据接口。" },
  { icon: <Globe size={22} />, title: "混合云网关", desc: "Gateway Runner 部署在 IDC、云服务器或树莓派，通过 gRPC 反向隧道自动建立加密连接，无需公网 IP。" },
  { icon: <Shield size={22} />, title: "多租户隔离", desc: "原生多租户架构，SuperAdmin / Admin / Viewer 三级角色。数据层、连接层、路由层全方位安全隔离。" },
  { icon: <Database size={22} />, title: "多数据库支持", desc: "统一连接 MySQL、PostgreSQL、Oracle、SQLite 等主流关系型数据库，一个平台管理所有数据源。" },
  { icon: <Layers size={22} />, title: "项目化管理", desc: "按项目组织 API 端点和数据源，支持多项目并行管理，清晰的权限边界和资源隔离。" },
  { icon: <Cpu size={22} />, title: "轻量高性能", desc: "Go 语言构建，单二进制部署。Gateway Runner 内存占用极低，适合边缘设备运行。" },
]

function Features() {
  return (
    <section id="features" className="relative py-40">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/[0.02] to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-20 text-center">
          <motion.p variants={fadeUp} custom={0} className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            核心特性
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-bold tracking-tight md:text-5xl">
            为企业级数据网关而生
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="mx-auto mt-5 max-w-xl text-[var(--text-secondary)]">
            从 SQL 编写到 API 发布，从内网穿透到多租户管理，一站式解决数据接口的全生命周期。
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} variants={fadeUp} custom={i}
              className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-10 backdrop-blur-sm transition-all duration-500 hover:border-[var(--border-hover)] hover:bg-white/[0.04]">
              <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[var(--accent)] opacity-0 blur-[80px] transition-opacity duration-500 group-hover:opacity-[0.06]" />
              <div className="relative">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-purple-500/10 text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
                  {f.icon}
                </div>
                <h3 className="mb-3 text-lg font-semibold">{f.title}</h3>
                <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Architecture ─── */
function Architecture() {
  return (
    <section id="architecture" className="relative py-40">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/[0.015] to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-20 text-center">
          <motion.p variants={fadeUp} custom={0} className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            系统架构
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-bold tracking-tight md:text-5xl">
            云端控制面 + 网关执行器
          </motion.h2>
        </motion.div>

        {/* Architecture diagram */}
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="mb-16 overflow-hidden rounded-3xl border border-[var(--border)] bg-[#0a0a0a] p-8 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] md:p-14">
          <pre className="overflow-x-auto text-[11px] leading-relaxed text-[var(--text-secondary)] md:text-[13px]">
{`┌──────────────────────────────────────────────────────────────────────┐
│                          OwlApi Cloud                                │
│                                                                      │
│   ┌──────────────┐    ┌────────────────┐    ┌─────────────────┐     │
│   │    Admin     │    │  Control Plane │    │   PostgreSQL    │     │
│   │  (Next.js)   │◄──►│   (Go + Gin)   │◄──►│   (Database)    │     │
│   │   :8000      │    │  HTTP   :3000  │    │    :5432        │     │
│   └──────────────┘    │  gRPC   :9090  │    └─────────────────┘     │
│                       └───────┬────────┘                            │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                    gRPC 双向流 (反向隧道)
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
 ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
 │ Gateway Runner  │  │ Gateway Runner  │  │ Gateway Runner  │
 │    公司 IDC     │  │   阿里云 ECS    │  │     树莓派      │
 │  MySQL / Oracle │  │   PostgreSQL    │  │     SQLite      │
 └─────────────────┘  └─────────────────┘  └─────────────────┘`}
          </pre>
        </motion.div>

        {/* 3 pillars */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-5 md:grid-cols-3">
          {[
            { num: "01", title: "Control Plane", desc: "云端核心服务。负责 API 管理、用户鉴权、多租户隔离和 Gateway Runner 调度。基于 Go + Gin + pgx 构建。" },
            { num: "02", title: "Gateway Runner", desc: "内网轻量代理。主动建立 gRPC 加密隧道，接收 SQL 指令并执行查询。敏感数据不出内网，仅传输结果。" },
            { num: "03", title: "gRPC 反向隧道", desc: "基于 HTTP/2 双向流通信。Runner 主动连接 Control Plane，无需开放公网端口，支持断线自动重连。" },
          ].map((item, i) => (
            <motion.div key={item.num} variants={fadeUp} custom={i}
              className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-10 backdrop-blur-sm transition hover:border-[var(--border-hover)]">
              <span className="mb-4 block text-5xl font-black text-white/[0.04]">{item.num}</span>
              <h3 className="mb-3 text-lg font-semibold">{item.title}</h3>
              <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Data Flow ─── */
function DataFlow() {
  const steps = [
    { label: "用户请求", sub: "HTTP REST API" },
    { label: "Control Plane", sub: "鉴权 · 路由 · 分发" },
    { label: "gRPC Stream", sub: "加密双向流" },
    { label: "Gateway Runner", sub: "SQL 执行引擎" },
    { label: "内网数据库", sub: "MySQL / PG / Oracle" },
  ]
  return (
    <section className="py-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-16 text-center">
          <motion.p variants={fadeUp} custom={0} className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            数据流
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-bold tracking-tight md:text-5xl">
            请求的完整旅程
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="flex flex-col items-center gap-3 md:flex-row md:gap-0">
          {steps.map((s, i) => (
            <motion.div key={s.label} variants={fadeUp} custom={i} className="flex items-center">
              <div className="flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-5 text-center backdrop-blur-sm md:px-8">
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="mt-1 text-xs text-[var(--text-secondary)]">{s.sub}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight size={18} className="mx-2 shrink-0 text-[var(--text-secondary)]/40 max-md:rotate-90" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Quick Start ─── */
function QuickStart() {
  const steps = [
    { step: "01", title: "克隆项目", code: "git clone https://github.com/bulolo/owlapi.git" },
    { step: "02", title: "启动服务", code: "cd owlapi && make dev-up" },
    { step: "03", title: "开始使用", code: "open http://localhost:8000" },
  ]
  return (
    <section id="quickstart" className="relative py-40">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/[0.015] to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-20 text-center">
          <motion.p variants={fadeUp} custom={0} className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            快速开始
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-bold tracking-tight md:text-5xl">
            三步启动，即刻体验
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="grid gap-5 md:grid-cols-3">
          {steps.map((item, i) => (
            <motion.div key={item.step} variants={fadeUp} custom={i}
              className="group rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-10 backdrop-blur-sm transition hover:border-[var(--border-hover)]">
              <div className="mb-6 text-6xl font-black text-white/[0.03]">{item.step}</div>
              <h3 className="mb-5 text-xl font-semibold">{item.title}</h3>
              <div className="flex items-center gap-3 rounded-xl bg-black/40 px-5 py-3.5 ring-1 ring-[var(--border)]">
                <Terminal size={14} className="shrink-0 text-[var(--accent)]" />
                <code className="truncate text-[13px] text-[var(--text-secondary)]">{item.code}</code>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── CTA ─── */
function CTA() {
  return (
    <section className="py-40">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
        className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
          准备好了吗？
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-lg text-[var(--text-secondary)]">
          OwlApi 完全开源，MIT 协议。立即部署，将你的 SQL 变成 API。
        </p>
        <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener"
          className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-purple-500 px-10 py-4 text-[15px] font-semibold text-white shadow-[0_0_40px_var(--glow)] transition-all hover:shadow-[0_0_60px_var(--glow)]">
          <Github size={18} /> Star on GitHub <ArrowRight size={16} className="transition group-hover:translate-x-1" />
        </a>
      </motion.div>
    </section>
  )
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-[13px] text-[var(--text-secondary)] sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-[var(--accent)] to-purple-500 text-[8px]">🦉</div>
          <span>© {new Date().getFullYear()} OwlApi</span>
        </div>
        <div className="flex items-center gap-6">
          <span>MIT License</span>
          <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener" className="transition hover:text-white">GitHub</a>
        </div>
      </div>
    </footer>
  )
}

/* ─── Page ─── */
export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Features />
      <Architecture />
      <DataFlow />
      <QuickStart />
      <CTA />
      <Footer />
    </>
  )
}
