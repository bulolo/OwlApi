"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Database, Globe, Shield, Zap, ArrowRight, Terminal, Layers, Cpu, Github, Check, Minus } from "lucide-react"

/* ─── Animations ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ 
    opacity: 1, 
    y: 0, 
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] as const } 
  }),
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
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'}`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className={`flex h-14 items-center justify-between rounded-full border px-6 transition-all duration-500 ${
          scrolled 
            ? 'bg-white/80 border-black/5 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-xl' 
            : 'bg-transparent border-transparent backdrop-blur-md'
        }`}>
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-neutral-900">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-xs text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">🦉</div>
            <span>OwlApi</span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium text-neutral-500 md:flex">
            <a href="#features" className="transition-colors hover:text-neutral-900">特性</a>
            <a href="#architecture" className="transition-colors hover:text-neutral-900">架构</a>
            <a href="#pricing" className="transition-colors hover:text-neutral-900">版本定价</a>
            <a href="#quickstart" className="transition-colors hover:text-neutral-900">快速开始</a>
          </div>
          <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener"
            className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-900 transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95">
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none mix-blend-multiply" />
      <div className="absolute top-[40%] right-[5%] w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-multiply" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-indigo-50/50 px-4 py-1.5 text-xs font-medium text-indigo-700 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          智能 SQL to API 网关 v0.1
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }}
          className="mx-auto mb-6 max-w-4xl text-5xl font-black tracking-tight text-neutral-900 md:text-7xl lg:text-8xl">
          编写 SQL。 <br/>
          <span className="text-gradient-brand leading-tight">一键生成 RESTful API。</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-neutral-600 md:text-xl md:leading-relaxed">
          企业级混合云网关架构。打破内网物理边界，让企业孤岛数据高度安全、可控地以 REST 接口向外暴露。
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href="#quickstart"
            className="group relative flex h-14 items-center gap-2 overflow-hidden rounded-full bg-neutral-900 px-10 text-[15px] font-semibold text-white shadow-[0_0_20px_rgba(0,0,0,0.1)] transition-all hover:scale-105 hover:bg-black hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] active:scale-95">
            一键极速体验 <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#pricing"
            className="flex h-14 items-center gap-2 rounded-full border border-neutral-200 bg-white px-10 text-[15px] font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 active:scale-95">
            了解服务方案
          </a>
        </motion.div>

        {/* Dashboard Mockup Component */}
        <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          className="relative mx-auto mt-24 max-w-5xl md:px-6 perspective-1000">
          <div className="absolute top-10 -bottom-10 left-10 right-10 rounded-[40px] bg-gradient-to-b from-indigo-500/20 to-emerald-500/10 blur-2xl opacity-60" />
          <div className="relative rounded-2xl border border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-xl overflow-hidden transform-gpu md:rotate-x-12 md:scale-[0.98] transition-transform duration-700 hover:rotate-x-0 hover:scale-100 ring-1 ring-black/5">
            {/* Mock Header */}
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 bg-neutral-50">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="mx-auto flex h-6 w-64 items-center justify-center rounded-md bg-neutral-200/50 text-[10px] text-neutral-500 font-medium">
                owlapi.cloud / endpoints
              </div>
            </div>
            {/* Mock Body */}
            <div className="flex h-[360px] md:h-[480px]">
              {/* Sidebar */}
              <div className="w-56 hidden border-r border-neutral-100 bg-neutral-50/50 p-5 md:flex flex-col gap-2">
                <div className="h-9 rounded-lg bg-indigo-50 text-indigo-700 text-[13px] flex items-center px-3 font-semibold">✨ API 接口管理</div>
                <div className="h-9 rounded-lg bg-transparent text-neutral-600 text-[13px] flex items-center px-3 hover:bg-neutral-100 transition cursor-pointer">🗄️ 数据源管理</div>
                <div className="h-9 rounded-lg bg-transparent text-neutral-600 text-[13px] flex items-center px-3 hover:bg-neutral-100 transition cursor-pointer">👥 多租户与权限</div>
                <div className="h-9 rounded-lg bg-transparent text-neutral-600 text-[13px] flex items-center px-3 hover:bg-neutral-100 transition cursor-pointer mt-4 border-t border-neutral-200/50">⚙️ 项目设置</div>
              </div>
              {/* Main Area */}
              <div className="flex-1 p-6 md:p-8 flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-neutral-900 font-bold text-xl flex items-center gap-3">
                      获取活跃用户列表
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100 text-xs font-semibold">已发布</span>
                    </h3>
                    <p className="text-neutral-400 text-sm mt-1 font-mono">GET /api/v1/users</p>
                  </div>
                </div>
                <div className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-5 font-mono text-sm overflow-hidden relative group shadow-inner">
                  <div className="text-indigo-400/80 mb-3 text-xs uppercase tracking-wider font-semibold">Query SQL Script</div>
                  <div className="text-neutral-700 leading-relaxed text-[15px]">
                    <span className="text-pink-600 font-semibold">SELECT</span> id, username, email, created_at<br/>
                    <span className="text-pink-600 font-semibold">FROM</span> public.users<br/>
                    <span className="text-pink-600 font-semibold">WHERE</span> status = <span className="text-emerald-600">@status</span><br/>
                    <span className="text-pink-600 font-semibold">ORDER BY</span> created_at <span className="text-pink-600 font-semibold">DESC</span><br/>
                    <span className="text-pink-600 font-semibold">LIMIT</span> <span className="text-emerald-600">@limit</span>;
                  </div>
                  {/* Fake Run Button */}
                  <div className="absolute bottom-5 right-5 bg-white border border-neutral-200 shadow-sm hover:shadow-md px-4 py-2 rounded-lg text-sm text-neutral-700 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 cursor-pointer font-sans font-medium">
                    <Zap size={14} className="text-indigo-500 fill-indigo-500/20"/> <span className="mt-pr-0.5">测试接口</span>
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
    <section id="features" className="relative py-32 z-10 bg-neutral-50">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-20 text-center">
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight text-neutral-900 md:text-5xl mb-4">
            面向未来的数据网关，<br className="hidden md:block"/> <span className="text-gradient">敏捷与安全典范。</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="max-w-2xl mx-auto text-neutral-500 text-lg">
            为复杂企业级架构量身打造。从编写 SQL 到 API 自动生成、发布，彻底消除样板代码，提升研发效能。
          </motion.p>
        </motion.div>

        {/* Bento Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          {/* Card 1: Large */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-10 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-50/50 via-transparent to-transparent pointer-events-none" />
            <div className="flex flex-col h-full justify-between relative z-10">
              <div className="max-w-md">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/50 shadow-inner">
                  <Zap size={28} className="fill-indigo-500/20" />
                </div>
                <h3 className="text-3xl font-bold text-neutral-900 mb-4 tracking-tight">SQL 到 RESTful API 瞬发</h3>
                <p className="text-neutral-500 leading-relaxed text-lg">直接编写 SQL 业务逻辑，后台自动推断参数类型。一键式发布为标准可调用的接口，无后顾之忧地抹去繁杂的接口开发样板工作。</p>
              </div>
              {/* Graphic element */}
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-[380px] h-[300px] bg-neutral-900 rounded-tl-3xl border-t border-l border-neutral-800 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] p-5 hidden md:flex flex-col">
                <div className="text-xs text-neutral-400 mb-4 border-b border-neutral-800 pb-3 flex items-center justify-between font-mono">
                  <span>endpoints.json (auto-generated)</span> 
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md">
                    <Check size={12}/> Syncing
                  </div>
                </div>
                <pre className="text-[12px] text-indigo-300 font-mono leading-relaxed flex-1 overflow-hidden">
{`{
  "api_version": "v1.4.2",
  "endpoints": [
    {
      "path": "/users",
      "method": "GET",
      "sql": "SELECT * FROM users",
      "auth_strategy": "jwt_rsa",
      "cache_ttl": "60s"
    }
  ]
}`}
                </pre>
              </div>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 group shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
              <Globe size={24} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-3">混合云 gRPC 反向隧道</h3>
            <p className="text-neutral-500 text-[15px] leading-relaxed">
              部署轻量级的执行节点 (Gateway Runner) 于极深内网。长链接双向流自动穿透，免受公网暴露的攻击威胁。
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 group shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-3">原生多租户与 RBAC 体系</h3>
            <p className="text-neutral-500 text-[15px] leading-relaxed">
              系统预置 SuperAdmin / Admin / Viewer 三级隔离权限。在数据源、通信管道和路由端点构建坚不可摧的越权围栏。
            </p>
          </motion.div>

          {/* Card 4: Wide */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 md:p-10 group shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Database size={24} />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">统一的主流数据库枢纽</h3>
              <p className="text-neutral-500 text-[15px] leading-relaxed mb-4 max-w-sm">
                开箱支持 MySQL、PostgreSQL、Oracle、SQLite 等。一次部署管理面，即可统管所有底层数据资产。
              </p>
            </div>
            <div className="flex-1 flex justify-end w-full">
              {/* Graphic database stack */}
              <div className="flex flex-col gap-3 w-full max-w-[240px]">
                {['PostgreSQL', 'MySQL', 'Oracle Database', 'Redis (Beta)'].map((db, i) => (
                  <div key={db} className="h-12 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center px-5 gap-3 text-sm text-neutral-700 font-medium shadow-sm transition-transform hover:scale-105">
                    <Database size={16} className={i === 0 ? "text-indigo-500" : i === 1 ? "text-blue-500" : i === 2 ? "text-red-500" : "text-orange-500"} /> {db}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Card 5 */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 md:p-10 group shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              <Cpu size={24} />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">边缘计算就绪</h3>
            <p className="text-neutral-500 text-[15px] leading-relaxed">
              网关引擎全栈以 Go 1.23 开发构建。打包产出仅数十兆的静态二进制文件，完美适配算力贫瘠的树莓派边缘环境。
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
    <section id="architecture" className="relative py-32 overflow-hidden bg-white">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
      
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 md:text-5xl mb-4 tracking-tight">部署分离机制与数据流向</h2>
          <p className="text-neutral-500 max-w-2xl mx-auto text-lg">管控面中枢 (Control Plane) 与 执行单元 (Gateway) 完全解耦合。核心库数据绝不落盘、中转抓取，仅负责流传输转。</p>
        </div>

        {/* Visual Diagram */}
        <div className="relative mx-auto max-w-5xl py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            {/* Control Plane Block */}
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="w-full md:w-72 p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xl shadow-indigo-100 relative group">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 border border-indigo-100 ring-4 ring-indigo-50/50">
                  <Layers size={32} className="text-indigo-600"/>
                </div>
                <h4 className="text-xl font-bold text-neutral-900 mb-2">Cloud Control Plane</h4>
                <div className="text-[13px] text-indigo-700 mb-4 bg-indigo-50 px-3 py-1 rounded-full font-semibold tracking-wide">Public Cloud / SaaS</div>
                <p className="text-sm text-neutral-500 leading-relaxed">全盘控制 API 注册发现、流控审计与外部请求鉴权系统（拦截不合法的数据拉取）。</p>
              </div>
            </motion.div>

            {/* Connecting Pipe */}
            <div className="hidden md:flex flex-1 items-center justify-center relative h-40">
              <div className="absolute left-0 right-0 h-[3px] bg-neutral-100 rounded-full" />
              <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 w-1/2 animate-[pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
              <div className="relative z-10 bg-white px-5 text-xs font-mono text-neutral-600 border border-neutral-200 shadow-md rounded-full py-2.5 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                <span className="font-semibold">gRPC 持续长链接反向穿透</span>
              </div>
            </div>

            {/* Default Vertical space for mobile */}
            <div className="md:hidden flex h-20 items-center justify-center">
               <div className="w-[2px] h-full bg-gradient-to-b from-indigo-400 to-emerald-400" />
            </div>

            {/* Gateway Runner Block */}
            <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="w-full md:w-72 p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xl shadow-emerald-100 relative group">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 border border-emerald-100 ring-4 ring-emerald-50/50">
                  <Terminal size={32} className="text-emerald-600"/>
                </div>
                <h4 className="text-xl font-bold text-neutral-900 mb-2">Gateway Runner 执行节点</h4>
                <div className="text-[13px] text-emerald-700 mb-4 bg-emerald-50 px-3 py-1 rounded-full font-semibold tracking-wide">Enterprise Intranet</div>
                <p className="text-sm text-neutral-500 leading-relaxed">潜伏于您公司的任意内网服务器直接操作数据库连接。指令受限，响应以 JSON 文档无痕向外延传递回 Control Plane。</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Pricing ─── */
function Pricing() {
  const plans = [
    {
      name: "社区版 · 开源构建",
      price: "永久免费",
      desc: "适合个人项目与探索阶段的小型团队使用。在任何环境免费部署完整的核心服务。",
      features: [
        "100% 核心控制面与执行引擎",
        "无限制的 API 生成数量",
        "支持 MySQL, PostgreSQL",
        "无限部署的 Gateway Runner 节点",
        "极其基础的系统级 RBAC",
      ],
      notIncluded: ["多租户复杂管理逻辑", "云上 SRE 代发代维代管", "SLA 承诺与服务团队支持"],
      buttonText: "拉取代办开始",
      buttonVariant: "outline",
      link: "https://github.com/bulolo/owlapi"
    },
    {
      name: "云端企业版 · SaaS 托管",
      price: "按需与流量阶梯定价",
      desc: "免除 Control Plane 的运维基建困境，将执行侧留在内网，完全托管、零介入启动服务。",
      badge: "最受独立开发者欢迎",
      features: [
        "包含社区版的所有功能",
        "全球高速多节点分发的云控平面",
        "高达 99.99% 的核心可用性保障",
        "无限量的外部数据库适配器支持",
        "开箱即用的访问日志分析图表",
        "内置高速长效的高速缓存层"
      ],
      notIncluded: [],
      buttonText: "免费试用 SaaS 系统",
      buttonVariant: "solid",
      link: "#"
    },
    {
      name: "专有私有化版 · 混合云网关",
      price: "联系解决方案顾问",
      desc: "提供高度定制的企业专属功能集群，适配银行/政企级内网合规与安全阻断标准。",
      features: [
        "云服务版本的全部底层高级功能",
        "提供 Control Plane 私有化集群部署包",
        "定制级别的安全策略审计导出",
        "7x24 小时 VVIP 专家驻场排障支持",
        "根据定制场景进行闭源功能的特装"
      ],
      notIncluded: [],
      buttonText: "联络销售专家团队",
      buttonVariant: "outline",
      link: "#"
    }
  ]

  return (
    <section id="pricing" className="relative py-32 bg-neutral-50">
       <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
       <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 md:text-5xl mb-4 tracking-tight">产品生态矩阵</h2>
            <p className="text-neutral-500 max-w-2xl mx-auto text-lg">从独立极客的自我摸索到大型商业帝国的安全构建。都能精确找到完美的对接层级方案。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}
                className={`relative flex flex-col rounded-3xl bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-2 ${
                  plan.badge ? 'border-2 border-indigo-500 shadow-indigo-100/50' : 'border border-neutral-200'
                }`}>
                
                {plan.badge && (
                   <div className="absolute -top-4 left-0 right-0 flex justify-center">
                     <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                       {plan.badge}
                     </span>
                   </div>
                )}

                <div className="mb-8">
                   <h3 className="text-lg font-semibold text-neutral-900 mb-2">{plan.name}</h3>
                   <div className="text-3xl font-black text-neutral-900 mb-4">{plan.price}</div>
                   <p className="text-sm text-neutral-500 leading-relaxed h-16">{plan.desc}</p>
                </div>

                <div className="flex-1">
                  <div className="text-[13px] font-bold text-neutral-900 uppercase tracking-widest mb-4">包括配置</div>
                  <ul className="flex flex-col gap-3 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex gap-3 text-[14.5px] text-neutral-600">
                        <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.notIncluded && plan.notIncluded.length > 0 && (
                     <>
                       <div className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest mb-4 mt-8">受到限制</div>
                       <ul className="flex flex-col gap-3">
                         {plan.notIncluded.map(f => (
                           <li key={f} className="flex gap-3 text-[14.5px] text-neutral-400 opacity-60">
                             <Minus size={18} className="text-neutral-400 shrink-0 mt-0.5" />
                             <span>{f}</span>
                           </li>
                         ))}
                       </ul>
                     </>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-neutral-100">
                  <a href={plan.link} className={`flex w-full justify-center rounded-xl px-4 py-3.5 text-sm font-semibold transition-all ${
                    plan.buttonVariant === 'solid' 
                    ? 'bg-neutral-900 text-white hover:bg-black hover:shadow-lg active:scale-95'
                    : 'bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 active:scale-95'
                  }`}>
                    {plan.buttonText}
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
       </div>
    </section>
  )
}

/* ─── CTA & Terminal ─── */
function CTA() {
  return (
    <section id="quickstart" className="relative py-32 overflow-hidden bg-neutral-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_center,rgba(99,102,241,0.2),transparent_60%)] pointer-events-none" />
      <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
        <h2 className="text-4xl font-black text-white md:text-6xl mb-6 tracking-tight">一键极速搭建私有基础设施</h2>
        <p className="text-lg text-neutral-400 mb-10 max-w-xl mx-auto">
          仅需一个 Clone 命令及 Make 构建。在本地立刻拉起全套数据库与完整前后端管理微服务集群。
        </p>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} 
          className="mx-auto max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-left mb-12">
          <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.03] px-5 py-3.5">
             <div className="flex gap-1.5">
               <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
               <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
               <div className="h-3 w-3 rounded-full bg-[#28c840]" />
             </div>
             <div className="text-[11px] text-neutral-500 ml-3 font-mono tracking-wider">bash - install</div>
          </div>
          <div className="p-8 font-mono text-[14px] leading-relaxed overflow-x-auto text-neutral-300">
             <div className="text-neutral-500 mb-4 opacity-80"># 克隆 OwlApi 最新的生产架构源码库</div>
             <div className="mb-2"><span className="text-emerald-400 mr-2">❯</span> <span className="text-indigo-400">git</span> clone https://github.com/bulolo/owlapi.git</div>
             <div className="mb-6"><span className="text-emerald-400 mr-2">❯</span> <span className="text-indigo-400">cd</span> owlapi && make dev-up</div>
             
             <div className="text-emerald-400 flex items-center gap-3 mb-1"><span className="text-neutral-500">✔</span> Admin System   <span className="text-neutral-600">→</span> <a href="#" className="underline decoration-neutral-600 underline-offset-4">localhost:8000</a></div>
             <div className="text-emerald-400 flex items-center gap-3"><span className="text-neutral-500">✔</span> Gateway Router <span className="text-neutral-600">→</span> <a href="#" className="underline decoration-neutral-600 underline-offset-4">localhost:3000</a></div>
          </div>
        </motion.div>

        <a href="https://github.com/bulolo/owlapi" target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-[15px] font-semibold text-black shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all hover:scale-105 hover:bg-neutral-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] active:scale-95">
          <Github className="w-5 h-5"/> 获取开源主程序代码库
        </a>
      </div>
    </section>
  )
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
           <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-purple-500 text-[11px] text-white shadow-sm">🦉</div>
           <span className="text-neutral-900 font-bold tracking-tight text-lg">OwlApi Team</span>
        </div>
        <div className="text-[13px] text-neutral-500 font-medium">
          &copy; {new Date().getFullYear()} 由 OwlApi 原始开发团队联合构建 · MIT 开源分发条款
        </div>
      </div>
    </footer>
  )
}

/* ─── Main Page ─── */
export default function Home() {
  return (
    <main className="bg-white min-h-screen selection:bg-indigo-100 selection:text-indigo-900 text-neutral-900">
      <Nav />
      <Hero />
      <BentoFeatures />
      <Architecture />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  )
}
