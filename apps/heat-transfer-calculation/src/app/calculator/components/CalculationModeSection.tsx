"use client"

import { useRouter } from "next/navigation"
import { SectionCard } from "./SectionCard"
import { FieldRow } from "./FieldRow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type HeatTransferMode = "storage" | "pipe" | "horizontal"

const MODES: Array<{ key: HeatTransferMode; label: string; href: string }> = [
  { key: "storage", label: "Storage Tank", href: "/calculator" },
  { key: "pipe", label: "Pipe", href: "/calculator/pipe" },
  { key: "horizontal", label: "Horizontal Tank", href: "/calculator/horizontal" },
]

interface CalculationModeSectionProps {
  activeMode: HeatTransferMode
}

export function CalculationModeSection({ activeMode }: CalculationModeSectionProps) {
  const router = useRouter()

  return (
    <SectionCard title="Calculation Mode">
      <FieldRow label="Mode">
        <Select
          value={activeMode}
          onValueChange={(value) => {
            const mode = MODES.find((item) => item.key === value)
            if (mode && mode.key !== activeMode) {
              router.push(mode.href)
            }
          }}
        >
          <SelectTrigger className="w-full h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((mode) => (
              <SelectItem key={mode.key} value={mode.key}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
    </SectionCard>
  )
}
