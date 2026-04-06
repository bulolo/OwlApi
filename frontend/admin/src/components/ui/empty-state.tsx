import type { LucideIcon } from "lucide-react"
import { Button } from "./button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-zinc-100">
        <Icon className="w-7 h-7 text-zinc-300" />
      </div>
      <p className="text-zinc-500 text-sm font-semibold">{title}</p>
      {description && <p className="text-zinc-400 text-xs mt-1">{description}</p>}
      {action && (
        <Button variant="outline" className="mt-5 text-xs h-8 px-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
