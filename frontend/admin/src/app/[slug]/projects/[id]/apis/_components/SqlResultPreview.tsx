"use client"

function extractArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.list)) return obj.list
  }
  return null
}

interface SqlResultPreviewProps {
  result: unknown
}

export function SqlResultPreview({ result }: SqlResultPreviewProps) {
  if (!result) return null

  if (typeof result === "object" && result !== null && "error" in result) {
    return (
      <div className="p-4 text-xs text-red-500 font-mono leading-relaxed">
        {(result as { error: string }).error}
      </div>
    )
  }

  let arr: unknown[] | null = null
  try { arr = extractArray(result) } catch { /* ignore */ }

  if (arr && arr.length > 0) {
    const keys = Object.keys(arr[0] as object)
    return (
      <table className="w-full text-left border-collapse text-xs">
        <thead className="sticky top-0 bg-zinc-50/90 backdrop-blur-sm">
          <tr>
            {keys.map(k => (
              <th key={k} className="px-3 py-2 font-bold text-muted-foreground border-b border-border-subtle whitespace-nowrap">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {arr.map((row, i) => (
            <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
              {Object.values(row as object).map((v, j) => (
                <td key={j} className="px-3 py-1.5 text-zinc-600 font-mono whitespace-nowrap border-b border-zinc-50">
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return <pre className="p-4 text-xs text-zinc-600 font-mono leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
}
