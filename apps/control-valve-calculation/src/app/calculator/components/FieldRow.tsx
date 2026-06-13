/**
 * FieldRow — reusable form row: label, input slot, optional unit badge, optional error.
 */
import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FieldRowProps {
  label: string
  htmlFor?: string
  unit?: React.ReactNode
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function FieldRow({
  label,
  htmlFor,
  unit,
  error,
  hint,
  required,
  children,
  className,
}: FieldRowProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <div className="flex-1">{children}</div>
        {unit && (
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {unit}
          </span>
        )}
      </div>
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
