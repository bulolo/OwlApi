"use client"

import { Search, Bell, Plus, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Header() {
  return (
    <header className="glass-header h-16 flex items-center justify-between px-6 border-b border-zinc-200/50">
      {/* Search Bar */}
      <div className="max-w-md w-full">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="搜索项目、API 或 网关..."
            className="w-full pl-10 h-9 bg-zinc-50/50 border-zinc-200 rounded-lg text-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
             <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-1.5 font-mono text-[10px] font-medium text-zinc-500">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="w-9 h-9 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/80 rounded-full">
          <HelpCircle className="w-5 h-5" />
        </Button>
        
        <div className="relative">
          <Button variant="ghost" size="icon" className="w-9 h-9 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/80 rounded-full">
            <Bell className="w-5 h-5" />
          </Button>
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </div>

        <div className="w-[1px] h-6 bg-zinc-200/60 mx-1" />

        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 px-4 text-sm font-medium shadow-sm shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
          <Plus className="w-4 h-4" />
          <span>新建资源</span>
        </Button>
      </div>
    </header>
  )
}
