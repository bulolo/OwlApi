"use client"

import { Languages } from "lucide-react"

export function LanguageSwitcher() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground cursor-default select-none">
      <Languages className="w-4 h-4" />
      <span className="text-2xs font-bold uppercase tracking-wider">中文</span>
    </div>
  )
}
