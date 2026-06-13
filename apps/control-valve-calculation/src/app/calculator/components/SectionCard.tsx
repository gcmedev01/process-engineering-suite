/**
 * SectionCard — consistent card wrapper for each input section.
 */
import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function SectionCard({ title, children, className, action }: SectionCardProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {action}
        </div>
        <Separator />
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
