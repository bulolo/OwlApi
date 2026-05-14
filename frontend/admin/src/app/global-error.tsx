"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled error:", error)
  }, [error])

  return (
    <html lang="zh">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="text-center space-y-4 p-8">
            <h2 className="text-lg font-bold text-foreground">应用发生错误</h2>
            <p className="text-sm text-muted-foreground">{error.message || "未知错误"}</p>
            <Button onClick={reset} className="text-sm">重试</Button>
          </div>
        </div>
      </body>
    </html>
  )
}
