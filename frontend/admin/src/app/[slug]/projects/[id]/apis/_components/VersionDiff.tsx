"use client"

import { useMemo } from "react"
import { diffLines, type Change } from "diff"
import { cn } from "@/lib/utils"
import type { EndpointVersion } from "@/lib/api-client"

/**
 * 单个版本相对于"上一个版本"的变更视图。
 * 渲染：SQL 行级 diff、关键标量字段 before/after、参数增删改、脚本/数据源引用变化。
 */
export function VersionDiff({ current, previous }: { current: EndpointVersion; previous?: EndpointVersion }) {
  // Hooks 必须无条件先调用，所以在早返回前 useMemo
  const snapA = previous?.snapshot
  const snapB = current.snapshot

  const sqlChanges = useMemo<Change[]>(
    () => diffLines(snapA?.sql ?? "", snapB?.sql ?? ""),
    [snapA?.sql, snapB?.sql],
  )
  const paramDelta = useMemo(() => diffParamDefs(
    (snapA?.param_defs ?? []) as ParamLite[],
    (snapB?.param_defs ?? []) as ParamLite[],
  ), [snapA?.param_defs, snapB?.param_defs])

  if (!previous) {
    return (
      <div className="rounded-lg border border-border-subtle bg-zinc-50 px-3 py-2.5 text-xs text-muted-foreground">
        这是首个版本，无可比较的上一版本。
      </div>
    )
  }
  if (!snapA || !snapB) {
    return (
      <div className="rounded-lg border border-border-subtle bg-zinc-50 px-3 py-2.5 text-xs text-muted-foreground">
        快照缺失，无法对比。
      </div>
    )
  }

  const scalarChanges: ScalarDiff[] = [
    { label: "路径",      a: snapA.path,                  b: snapB.path },
    { label: "方法",      a: (snapA.methods ?? []).join(", "), b: (snapB.methods ?? []).join(", ") },
    { label: "摘要",      a: snapA.summary,               b: snapB.summary },
    { label: "数据源",    a: refLabel(previous.datasource_ref), b: refLabel(current.datasource_ref) },
    { label: "前置脚本",  a: scriptLabel(previous.pre_script_snapshot),  b: scriptLabel(current.pre_script_snapshot) },
    { label: "后置脚本",  a: scriptLabel(previous.post_script_snapshot), b: scriptLabel(current.post_script_snapshot) },
  ].filter(c => (c.a ?? "") !== (c.b ?? ""))

  const sqlChanged = sqlChanges.some(c => c.added || c.removed)

  const nothingChanged =
    scalarChanges.length === 0 &&
    !sqlChanged &&
    paramDelta.added.length === 0 &&
    paramDelta.removed.length === 0 &&
    paramDelta.changed.length === 0

  return (
    <div className="space-y-3">
      <p className="text-2xs text-muted-foreground">
        对比基准：<span className="font-bold">v{previous.version}</span> → <span className="font-bold">v{current.version}</span>
      </p>

      {nothingChanged && (
        <div className="rounded-lg border border-border-subtle bg-zinc-50 px-3 py-2.5 text-xs text-muted-foreground">
          相比 v{previous.version} 无差异。（通常是手动触发「仅创建版本」的快照动作）
        </div>
      )}

      {/* 标量字段 */}
      {scalarChanges.length > 0 && (
        <div className="rounded-lg border border-border-subtle overflow-hidden">
          <table className="w-full text-xs">
            <tbody>
              {scalarChanges.map(c => (
                <tr key={c.label} className="border-b border-border-subtle last:border-b-0">
                  <td className="w-24 px-3 py-2 bg-zinc-50 text-2xs font-bold text-muted-foreground uppercase tracking-wider">
                    {c.label}
                  </td>
                  <td className="px-3 py-2 bg-red-50/40">
                    <span className="text-red-700 line-through font-mono break-all">{c.a || <em className="not-italic text-red-300">（空）</em>}</span>
                  </td>
                  <td className="px-3 py-2 bg-emerald-50/40">
                    <span className="text-emerald-700 font-mono break-all">{c.b || <em className="not-italic text-emerald-300">（空）</em>}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 参数增删改 */}
      {(paramDelta.added.length > 0 || paramDelta.removed.length > 0 || paramDelta.changed.length > 0) && (
        <div className="space-y-1">
          <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">参数变更</p>
          <div className="flex flex-wrap gap-1.5">
            {paramDelta.removed.map(p => (
              <span key={`r-${p.name}`} className="inline-flex items-center gap-1 text-xs font-mono bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded line-through">
                <span className="font-bold">{p.name}</span><span>{p.type}</span>
              </span>
            ))}
            {paramDelta.added.map(p => (
              <span key={`a-${p.name}`} className="inline-flex items-center gap-1 text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                <span className="font-bold">+ {p.name}</span><span>{p.type}</span>
              </span>
            ))}
            {paramDelta.changed.map(c => (
              <span key={`c-${c.name}`} className="inline-flex items-center gap-1 text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                <span className="font-bold">~ {c.name}</span>
                <span className="opacity-70">{c.summary}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SQL 行级 diff */}
      {sqlChanged && (
        <div className="space-y-1">
          <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">SQL 变更</p>
          <SqlDiff changes={sqlChanges} />
        </div>
      )}
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────────

interface ScalarDiff { label: string; a?: string; b?: string }
interface ParamLite { name: string; type?: string; required?: boolean; default?: string; desc?: string }

function refLabel(ref?: { name?: string } | null) {
  return ref?.name ?? ""
}

function scriptLabel(snap?: { name?: string } | null) {
  return snap?.name ?? ""
}

function diffParamDefs(prev: ParamLite[], next: ParamLite[]) {
  const prevMap = new Map(prev.map(p => [p.name, p]))
  const nextMap = new Map(next.map(p => [p.name, p]))
  const added: ParamLite[] = []
  const removed: ParamLite[] = []
  const changed: { name: string; summary: string }[] = []

  for (const [name, p] of nextMap) {
    if (!prevMap.has(name)) added.push(p)
  }
  for (const [name, p] of prevMap) {
    if (!nextMap.has(name)) removed.push(p)
  }
  for (const [name, p] of prevMap) {
    const q = nextMap.get(name)
    if (!q) continue
    const changes: string[] = []
    if ((p.type ?? "") !== (q.type ?? "")) changes.push(`类型 ${p.type ?? "—"} → ${q.type ?? "—"}`)
    if (!!p.required !== !!q.required) changes.push(q.required ? "改为必填" : "改为选填")
    if ((p.default ?? "") !== (q.default ?? "")) changes.push(`默认值 ${p.default || "—"} → ${q.default || "—"}`)
    if ((p.desc ?? "") !== (q.desc ?? "")) changes.push("描述变更")
    if (changes.length > 0) changed.push({ name, summary: changes.join("; ") })
  }
  return { added, removed, changed }
}

function SqlDiff({ changes }: { changes: Change[] }) {
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden bg-zinc-50">
      <pre className="text-xs leading-relaxed font-mono overflow-x-auto">
        {changes.map((chunk, i) => {
          const lines = chunk.value.replace(/\n$/, "").split("\n")
          return lines.map((line, j) => (
            <div
              key={`${i}-${j}`}
              className={cn(
                "px-3 py-0.5 whitespace-pre",
                chunk.added   ? "bg-emerald-50 text-emerald-800 border-l-2 border-emerald-400"
                : chunk.removed ? "bg-red-50 text-red-800 border-l-2 border-red-400"
                : "text-zinc-600"
              )}
            >
              <span className="select-none mr-2 text-muted-foreground inline-block w-3">
                {chunk.added ? "+" : chunk.removed ? "−" : " "}
              </span>
              {line || " "}
            </div>
          ))
        })}
      </pre>
    </div>
  )
}
