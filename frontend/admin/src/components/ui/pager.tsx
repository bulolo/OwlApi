"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PagerProps {
  page: number
  size: number
  total: number
  sizeOptions?: number[]
  onPageChange: (page: number) => void
  onSizeChange?: (size: number) => void
  className?: string
}

export function Pager({
  page, size, total,
  sizeOptions = [10, 20, 50, 100],
  onPageChange, onSizeChange,
  className,
}: PagerProps) {
  const totalPages = Math.ceil(total / size) || 1
  const start = total === 0 ? 0 : (page - 1) * size + 1
  const end = Math.min(page * size, total)

  const pages = getPageNumbers(page, totalPages)

  return (
    <div className={cn("flex items-center justify-between gap-4 px-4 py-3 border-t border-zinc-100 bg-zinc-50/30", className)}>
      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
        <span>第 {start}-{end} 条，共 {total} 条</span>
        {onSizeChange && (
          <>
            <span className="text-zinc-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>每页</span>
              <Select value={String(size)} onValueChange={(v) => { onSizeChange(Number(v)); onPageChange(1) }}>
                <SelectTrigger className="h-7 w-[72px] text-[11px] border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} 条</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7 border-zinc-200" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1.5 text-zinc-400 text-xs">...</span>
          ) : (
            <Button
              key={p}
              variant={page === p ? "default" : "outline"}
              size="icon"
              className={cn("h-7 w-7 text-xs font-bold", page === p && "bg-blue-600 text-white hover:bg-blue-700")}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          )
        )}

        <Button variant="outline" size="icon" className="h-7 w-7 border-zinc-200" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | string)[] = [1]
  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')
  if (total > 1) pages.push(total)

  return pages
}
