"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { BookOpen, Loader2 } from "lucide-react"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

function buildSwaggerHtml(spec: Record<string, unknown>, origin: string): string {
  const specJson = JSON.stringify(spec)
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Docs</title>
  <base href="${origin}/" />
  <link rel="stylesheet" href="${origin}/swagger-ui/swagger-ui.css" />
  <style>body { margin: 0; } .swagger-ui .topbar { display: none; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${origin}/swagger-ui/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${specJson},
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      docExpansion: 'list',
      defaultModelsExpandDepth: -1,
    })
  </script>
</body>
</html>`
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prevBlob = useRef<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`${BASE_URL}/public/openapi/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("分享链接无效或已失效")
        return r.json()
      })
      .then((envelope: { data: Record<string, unknown> } | Record<string, unknown>) => {
        // backend wraps in { data: ... }
        const spec = (envelope as { data: Record<string, unknown> }).data ?? envelope
        const html = buildSwaggerHtml(spec as Record<string, unknown>, window.location.origin)
        const blob = new Blob([html], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        if (prevBlob.current) URL.revokeObjectURL(prevBlob.current)
        prevBlob.current = url
        setBlobUrl(url)
      })
      .catch(e => setError(e instanceof Error ? e.message : "加载失败"))

    return () => {
      if (prevBlob.current) {
        URL.revokeObjectURL(prevBlob.current)
        prevBlob.current = null
      }
    }
  }, [token])

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-200 flex-shrink-0">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-foreground">API 文档</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {!blobUrl && !error && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-sm text-red-500">{error}</div>
        )}
        {blobUrl && (
          <iframe src={blobUrl} className="w-full h-full border-0" title="API 文档" />
        )}
      </div>
    </div>
  )
}
