"use client"

import { Activity, Server, Users, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { motion } from "framer-motion"

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">系统总览</h1>
        <p className="text-sm text-zinc-500 mt-1">实时监控系统运行状态与核心指标。</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="总请求数 (今日)" 
          value="128,430" 
          change="+12.5%" 
          trend="up"
          icon={Activity}
          color="blue"
        />
        <StatCard 
          title="在线 Agent 节点" 
          value="8/12" 
          change="2 Offline" 
          trend="down"
          icon={Server}
          color="indigo"
        />
        <StatCard 
          title="活跃 API 接口" 
          value="42" 
          change="+4 New" 
          trend="up"
          icon={Zap}
          color="amber"
        />
        <StatCard 
          title="注册用户" 
          value="1,240" 
          change="+8.2%" 
          trend="up"
          icon={Users}
          color="emerald"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-zinc-900">流量趋势</h3>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 bg-zinc-100 rounded text-zinc-600 font-medium">24H</span>
              <span className="text-xs px-2 py-1 hover:bg-zinc-50 rounded text-zinc-400 font-medium cursor-pointer">7D</span>
            </div>
          </div>
          <div className="h-[320px] bg-zinc-50/50 rounded border border-dashed border-zinc-200 flex items-center justify-center">
            <p className="text-sm text-zinc-400 font-medium">Chart Visualization Placeholder</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
           <h3 className="text-base font-bold text-zinc-900 mb-4">最近动态</h3>
           <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:h-full before:w-[2px] before:bg-zinc-100">
             {[1,2,3,4,5].map((i) => (
               <div key={i} className="relative flex items-start gap-4">
                 <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-100 flex items-center justify-center shrink-0 z-10">
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                 </div>
                 <div>
                   <p className="text-sm text-zinc-800 font-medium">API <span className="text-blue-600 font-mono">GET /users/list</span> 更新发布</p>
                   <p className="text-xs text-zinc-400 mt-1">2 分钟前 by Admin</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change, trend, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-50",
    indigo: "text-indigo-600 bg-indigo-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
  }

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-zinc-200/60 p-5 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{title}</p>
        <h3 className="text-2xl font-bold text-zinc-900 mt-1 tracking-tight">{value}</h3>
      </div>
    </motion.div>
  )
}
