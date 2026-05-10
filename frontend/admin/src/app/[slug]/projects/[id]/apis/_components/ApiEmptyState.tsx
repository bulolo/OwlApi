"use client"

import { Button } from "@/components/ui/button"
import { Terminal, Plus, ScrollText } from "lucide-react"

export function ApiEmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-16 bg-white">
      <div className="w-16 h-16 rounded-lg bg-blue-50/30 border border-blue-100 flex items-center justify-center mb-6 shadow-sm">
        <Terminal className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-bold text-zinc-800 tracking-tight mb-2">开启 API 设计之旅</h3>
      <p className="text-sm text-zinc-400 max-w-sm font-medium leading-relaxed mb-8">
        从左侧选择接口编辑，或创建一个全新的 API 接口。
      </p>
      <Button onClick={onCreateNew} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 group">
        <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" /> 创建 API 接口
      </Button>
    </div>
  )
}

export function LogsPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-16 bg-white min-h-[400px]">
      <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center mb-5 border border-zinc-100">
        <ScrollText className="w-7 h-7 text-zinc-300" />
      </div>
      <h3 className="text-sm font-bold text-zinc-600 tracking-tight">访问日志即将上线</h3>
      <p className="text-xs text-zinc-400 mt-2 max-w-xs text-center leading-relaxed">
        高性能日志模块正在开发中，未来可在此查看接口调用频次和延迟分析。
      </p>
    </div>
  )
}
