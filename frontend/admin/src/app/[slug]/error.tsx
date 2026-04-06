"use client"

import { useEffect } from "react"

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
        <h2 className="text-lg font-bold text-zinc-900">页面加载失败</h2>
        <p className="text-sm text-zinc-500">{error.message || "未知错误"}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    </div>
  )
}
