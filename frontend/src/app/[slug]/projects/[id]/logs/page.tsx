"use client"

import { Clock, Search, Filter, ArrowRight, CheckCircle2, XCircle, AlertCircle, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"

const MOCK_LOGS = [
  { id: '1', time: '2024-02-06 00:07:25', method: 'GET', path: '/v1/users/profile', status: 200, latency: '24ms', type: 'success' },
  { id: '2', time: '2024-02-06 00:07:22', method: 'POST', path: '/v1/ai/completions', status: 200, latency: '482ms', type: 'success' },
  { id: '3', time: '2024-02-06 00:07:15', method: 'GET', path: '/v1/data/query', status: 401, latency: '12ms', type: 'error' },
  { id: '4', time: '2024-02-06 00:06:58', method: 'PUT', path: '/v1/settings/network', status: 204, latency: '35ms', type: 'success' },
  { id: '5', time: '2024-02-06 00:06:44', method: 'POST', path: '/v1/files/upload', status: 500, latency: '1.2s', type: 'warning' },
  { id: '6', time: '2024-02-06 00:06:30', method: 'GET', path: '/v1/metrics/realtime', status: 200, latency: '18ms', type: 'success' },
]

export default function ProjectLogsPage() {
  return (
    <div className="space-y-8">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 border border-zinc-200 rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input 
            type="text" 
            placeholder="搜索请求路径、状态码..." 
            className="w-full pl-9 h-8 bg-zinc-50 border-none rounded text-[11px] focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 h-8 bg-zinc-50 border border-zinc-200 rounded text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 transition-colors">
            <Filter className="w-3 h-3" />
            筛选过滤器
          </button>
          <button className="flex items-center gap-1.5 px-3 h-8 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition-colors">
            导出日志
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">时间戳 (Timestamp)</th>
                <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">方法</th>
                <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">路径</th>
                <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">状态</th>
                <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">延迟</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {MOCK_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors group cursor-pointer">
                  <td className="px-4 py-3.5 text-[11px] font-medium text-zinc-400 whitespace-nowrap">
                    {log.time}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                      log.method === 'GET' ? "bg-blue-50 text-blue-600" :
                      log.method === 'POST' ? "bg-emerald-50 text-emerald-600" :
                      log.method === 'PUT' ? "bg-amber-50 text-amber-600" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] font-bold text-zinc-700 truncate max-w-[200px]">
                    {log.path}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {log.type === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-500" /> }
                      {log.type === 'error' && <XCircle className="w-3 h-3 text-rose-500" /> }
                      {log.type === 'warning' && <AlertCircle className="w-3 h-3 text-amber-500" /> }
                      <span className={cn(
                        "text-[11px] font-black",
                        log.type === 'success' ? "text-emerald-600" :
                        log.type === 'error' ? "text-rose-600" : "text-amber-600"
                      )}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] font-medium text-zinc-500">
                    {log.latency}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button className="p-1 hover:bg-zinc-100 rounded transition-colors text-zinc-400 group-hover:text-blue-600">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Terminal Toggle Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-500 text-[9px] font-bold uppercase tracking-widest">
            <Terminal className="w-3 h-3 text-emerald-500" />
            <span>实时流量监控已就绪</span>
          </div>
          <button className="text-[9px] font-bold text-zinc-400 hover:text-white transition-colors uppercase">
            展开终端视图
          </button>
        </div>
      </div>
    </div>
  )
}
