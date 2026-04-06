"use client"

import { useEffect } from "react"

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
            <h2 className="text-lg font-bold text-zinc-900">应用发生错误</h2>
            <p className="text-sm text-zinc-500">{error.message || "未知错误"}</p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              重试
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
