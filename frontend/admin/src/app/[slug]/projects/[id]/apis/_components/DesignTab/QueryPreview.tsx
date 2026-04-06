"use client"

import { Trash2, ScrollText } from "lucide-react"
import { useEndpointStore } from "../../_store/useEndpointStore"

/**
 * QueryPreview — 查询执行结果预览面板
 *
 * 嵌入在 SQL 编辑器下方，展示 design 模式的执行结果
 */
export function QueryPreview() {
  const designExecResult = useEndpointStore(s => s.designExecResult)
  const setDesignExecResult = useEndpointStore(s => s.setDesignExecResult)

  return (
    <div className="h-48 bg-white border-t border-zinc-100 flex flex-col animate-in slide-in-from-bottom-2 duration-300">
      <div className="px-4 py-2 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/30">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <ScrollText className="w-3.5 h-3.5" /> 查询预览
        </span>
        <button onClick={() => setDesignExecResult(null)} className="text-zinc-400 hover:text-zinc-600">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        {!designExecResult ? (
          <div className="p-4 text-xs text-zinc-500 font-mono italic">等待查询...</div>
        ) : isError(designExecResult) ? (
          <div className="p-4 text-xs text-red-500 font-mono italic">{designExecResult.error}</div>
        ) : (
          <ResultRenderer data={designExecResult} />
        )}
      </div>
    </div>
  )
}

// ── Helpers ──

function isError(result: unknown): result is { error: string } {
  return typeof result === "object" && result !== null && "error" in result
}

/** 尝试从各种响应格式中提取数组数据 */
function extractArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.list)) return obj.list
    if (obj.data && typeof obj.data === "object") {
      const nested = obj.data as Record<string, unknown>
      if (Array.isArray(nested.list)) return nested.list
    }
  }
  return null
}

function ResultRenderer({ data }: { data: unknown }) {
  try {
    const arr = extractArray(data)

    if (arr && arr.length > 0) {
      const firstRow = arr[0] as Record<string, unknown>
      const keys = Object.keys(firstRow || {})

      return (
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white z-10 border-b border-zinc-100">
            <tr>
              {keys.map(key => (
                <th key={key} className="px-3 py-2 text-[9px] font-black text-zinc-400 uppercase bg-zinc-50/50">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {arr.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50 transition-colors">
                {Object.values(row as Record<string, unknown>).map((val, j) => (
                  <td key={j} className="px-3 py-2 text-[11px] text-zinc-600 font-mono whitespace-nowrap">
                    {typeof val === "object" ? JSON.stringify(val) : String(val ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    return (
      <div className="p-4 bg-zinc-50 h-full">
        <pre className="text-[11px] text-zinc-600 font-mono whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    )
  } catch (e) {
    return <div className="p-4 text-xs text-red-500 font-mono">渲染错误: {String(e)}</div>
  }
}
