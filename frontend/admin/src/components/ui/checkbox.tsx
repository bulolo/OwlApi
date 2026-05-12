"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked, onCheckedChange, disabled, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "shrink-0 w-4 h-4 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          checked
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-zinc-300 hover:border-zinc-400",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
      </button>
    )
  },
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
