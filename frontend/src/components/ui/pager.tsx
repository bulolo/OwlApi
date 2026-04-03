"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PagerProps {
  page: number
  size: number
  total: number
  sizeOptions?: number[]
  onChange: (page: number, size: number) => void
}

export function Pager({ page, size, total, sizeOptions = [10, 20, 50, 100], onChange }: PagerProps) {
  const totalPages = Math.ceil(total / size) || 1
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
      <div className="flex items-center gap-3">
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          共 {total} 条
        </p>
        <select
          value={size}
          onChange={(e) => onChange(1, Number(e.target.value))}
          className="h-7 px-2 text-[10px] font-bold border border-zinc-200 rounded-md bg-white text-zinc-600 cursor-pointer"
        >
          {sizeOptions.map((s) => (
            <option key={s} value={s}>{s} 条/页</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="icon"
          className="h-7 w-7 border-zinc-200"
          disabled={!hasPrev}
          onClick={() => onChange(page - 1, size)}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p: number
          if (totalPages <= 5) {
            p = i + 1
          } else if (page <= 3) {
            p = i + 1
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i
          } else {
            p = page - 2 + i
          }
          return (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className={cn("h-7 w-7 text-[10px] font-bold", p === page ? "bg-blue-600 text-white" : "border-zinc-200")}
              onClick={() => onChange(p, size)}
            >
              {p}
            </Button>
          )
        })}
        <Button
          variant="outline" size="icon"
          className="h-7 w-7 border-zinc-200"
          disabled={!hasNext}
          onClick={() => onChange(page + 1, size)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <p className="text-[10px] text-zinc-400 font-bold ml-2">
          {page}/{totalPages}
        </p>
      </div>
    </div>
  )
}
