"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Route error:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 p-8">
        <h2 className="text-lg font-bold text-foreground">页面加载失败</h2>
        <p className="text-sm text-muted-foreground">{error.message || "未知错误"}</p>
        <Button onClick={reset} className="text-sm">重试</Button>
      </div>
    </div>
  )
}
