"use client"

import { useEdition } from "@/hooks/useEdition"
import { cn } from "@/lib/utils"

/**
 * 当前 edition 的小徽章，给设置页 / Header 角落用，让运维一眼看出
 * 这是社区版还是企业版、license 是否已生效。
 *
 *  - 社区版         → 灰色  "Community"
 *  - 企业版 + 授权  → 紫色  "Enterprise · ✓"
 *  - 企业版 - 未授权 → 琥珀  "Enterprise · 未授权"
 */
export function EditionBadge({ className }: { className?: string }) {
  const { edition, isLicensed, isLoading } = useEdition()
  if (isLoading) return null

  if (edition === "community") {
    return (
      <Pill tone="zinc" className={className}>
        Community Edition
      </Pill>
    )
  }

  return isLicensed ? (
    <Pill tone="violet" className={className}>
      Enterprise · ✓
    </Pill>
  ) : (
    <Pill tone="amber" className={className} title="Enterprise 构建但 license 校验失败；EE 功能已回退到 CE 行为">
      Enterprise · 未授权
    </Pill>
  )
}

function Pill({
  tone,
  className,
  title,
  children,
}: {
  tone: "zinc" | "violet" | "amber"
  className?: string
  title?: string
  children: React.ReactNode
}) {
  const toneCls = {
    zinc: "bg-zinc-50 text-zinc-600 border-zinc-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  }[tone]
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center text-2xs font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
        toneCls,
        className,
      )}
    >
      {children}
    </span>
  )
}
