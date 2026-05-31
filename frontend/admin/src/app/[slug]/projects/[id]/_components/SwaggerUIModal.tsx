"use client"

import { useState, useEffect, useRef } from "react"
import { BookOpen, CheckCircle2, Loader2, Share2, Check, Copy, Trash2 } from "lucide-react"
import { exportOpenApi } from "@/lib/sdk"
import type { EnvironmentResp } from "@/lib/sdk"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { envColor } from "../_utils/envColor"
import {
  apiGetOpenAPIShareToken,
  apiCreateOpenAPIShareToken,
  apiRevokeOpenAPIShareToken,
} from "@/lib/query"

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
  <style>
    body { margin: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  projectId: number
  envs: EnvironmentResp[]
}

export function SwaggerUIModal({ open, onOpenChange, slug, projectId, envs }: Props) {
  const [selectedEnv, setSelectedEnv] = useState<string>(() => envs[0]?.name ?? "")
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // share state
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const prevBlobUrl = useRef<string | null>(null)

  // Auto-select first env when modal opens and no env is selected yet
  useEffect(() => {
    if (open && !selectedEnv && envs.length > 0) {
      setSelectedEnv(envs[0].name)
    }
  }, [open, envs, selectedEnv])

  // Load spec
  useEffect(() => {
    if (!open || !selectedEnv) return
    setBlobUrl(null)
    setError(null)
    setLoading(true)

    exportOpenApi(slug, projectId, { env: selectedEnv })
      .then(s => {
        const html = buildSwaggerHtml(s as Record<string, unknown>, window.location.origin)
        const blob = new Blob([html], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
        prevBlobUrl.current = url
        setBlobUrl(url)
      })
      .catch(e => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false))

    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current)
        prevBlobUrl.current = null
      }
    }
  }, [open, slug, projectId, selectedEnv])

  // Load existing share token when env changes
  useEffect(() => {
    if (!open || !selectedEnv) return
    setShareToken(null)
    apiGetOpenAPIShareToken(slug, projectId, selectedEnv)
      .then(r => setShareToken(r.token))
      .catch(() => setShareToken(null)) // 404 = no token, that's fine
  }, [open, slug, projectId, selectedEnv])

  const shareUrl = shareToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}` : null

  const handleCreate = async () => {
    setShareLoading(true)
    try {
      const r = await apiCreateOpenAPIShareToken(slug, projectId, selectedEnv)
      setShareToken(r.token)
      const url = `${window.location.origin}/share/${r.token}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } finally {
      setShareLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleRevoke = async () => {
    setShareLoading(true)
    try {
      await apiRevokeOpenAPIShareToken(slug, projectId, selectedEnv)
      setShareToken(null)
    } finally {
      setShareLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[1200px] h-[90vh] p-0 gap-0 rounded-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              在线 API 文档
            </DialogTitle>

            <div className="flex items-center gap-3 mr-8">
              {/* Env tabs */}
              <div className="flex items-center gap-2">
                {envs.map(env => {
                  const ec = envColor(env.name)
                  const isSelected = selectedEnv === env.name
                  return (
                    <button
                      key={env.id}
                      onClick={() => setSelectedEnv(env.name)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border-subtle bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-white"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", ec.bg)} />
                      {env.name}
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                  )
                })}
              </div>

              {/* Share controls */}
              {shareToken ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50">
                  <Share2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  <span className="text-2xs font-bold text-emerald-700 max-w-[120px] truncate"
                    title={shareUrl ?? ""}>
                    分享中
                  </span>
                  <button
                    onClick={handleCopy}
                    title="复制分享链接"
                    className="ml-1 p-0.5 rounded hover:bg-emerald-100 transition-colors"
                  >
                    {copied
                      ? <Check className="w-3 h-3 text-emerald-600" />
                      : <Copy className="w-3 h-3 text-emerald-600" />}
                  </button>
                  <button
                    onClick={handleRevoke}
                    disabled={shareLoading}
                    title="撤销分享链接"
                    className="p-0.5 rounded hover:bg-red-100 transition-colors"
                  >
                    {shareLoading
                      ? <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
                      : <Trash2 className="w-3 h-3 text-zinc-400 hover:text-red-500" />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={shareLoading || !selectedEnv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-white text-xs font-bold transition-all"
                >
                  {shareLoading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Share2 className="w-3 h-3" />}
                  分享
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-white">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-sm text-red-500">{error}</div>
          )}
          {blobUrl && !loading && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title="API 文档"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
