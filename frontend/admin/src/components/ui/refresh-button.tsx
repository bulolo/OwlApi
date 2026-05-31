import { RefreshCw } from "lucide-react"
import { Button } from "./button"

/**
 * 列表页统一的「刷新」按钮（ghost 风格）。
 * 收口此前散落在各列表页、className 一字不差的复制粘贴。
 */
export function RefreshButton({
  onClick,
  label = "刷新",
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <Button
      variant="ghost"
      className="h-9 px-4 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-zinc-100"
      onClick={onClick}
    >
      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {label}
    </Button>
  )
}
