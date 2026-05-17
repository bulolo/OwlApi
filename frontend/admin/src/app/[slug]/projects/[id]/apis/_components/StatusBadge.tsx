"use client"

import { cn } from "@/lib/utils"
import type { ApiEndpoint } from "@/lib/api-client"

/**
 * 三段式状态徽章。
 *
 * 派生规则（由 ep 上的字段组合得出）：
 *   is_published = false, latest_version = 0  → 未发布
 *   is_published = false, latest_version > 0  → 已下线（曾经发布过）
 *   is_published = true,  has_draft = false, active == latest → vN 已上线
 *   is_published = true,  has_draft = true                    → vN 已上线 · 有未发布修改
 *   is_published = true,  active < latest                     → vN 已上线 · vM 待上线
 *   未持久化保存过的全新接口（isNew = true）                    → 草稿 · 未发布
 */
export function StatusBadge({ ep, isNew }: { ep?: ApiEndpoint | null; isNew?: boolean }) {
  if (isNew || !ep) {
    return <Pill tone="zinc">草稿 · 未发布</Pill>
  }

  const isPublished = ep.is_published
  const hasDraft = ep.has_draft
  const active = ep.active_version ?? 0
  const latest = ep.latest_version ?? 0

  if (!isPublished) {
    return latest > 0
      ? <Pill tone="zinc">已下线</Pill>
      : <Pill tone="amber">未发布</Pill>
  }

  // is_published === true
  return (
    <span className="inline-flex items-center gap-1">
      <Pill tone="emerald">v{active} 已上线</Pill>
      {hasDraft && <Pill tone="amber">有未发布修改</Pill>}
      {!hasDraft && latest > active && <Pill tone="blue">v{latest} 待上线</Pill>}
    </span>
  )
}

function Pill({ tone, children }: { tone: "emerald" | "amber" | "zinc" | "blue"; children: React.ReactNode }) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    zinc: "bg-zinc-50 text-zinc-600 border-zinc-200",
    blue: "bg-primary/10 text-primary border-primary/30",
  }[tone]
  return (
    <span className={cn(
      "inline-flex items-center text-2xs font-black px-2 py-0.5 rounded-md border uppercase tracking-wider",
      cls,
    )}>
      {children}
    </span>
  )
}
