"use client"

import { useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { Expand } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SectionCard } from "./SectionCard"
import type { CalculationInput } from "@/types"

/**
 * Control-valve schematic: inlet/outlet pipe with a globe-style valve body,
 * actuator, and flow direction. Purely illustrative (no scaled geometry).
 */
export function SchematicCard() {
  const [isOpen, setIsOpen] = useState(false)
  const { control } = useFormContext<CalculationInput>()
  const valveType = useWatch({ control, name: "valve.valveType" }) ?? "globe"

  const renderSvg = (svgClassName: string) => (
    <svg viewBox="0 0 420 260" className={svgClassName} aria-hidden="true">
      {/* Pipe */}
      <line x1="20" y1="170" x2="400" y2="170" stroke="currentColor" strokeWidth="10" className="opacity-30" />
      {/* Flow arrows */}
      <polygon points="60,170 50,164 50,176" fill="currentColor" className="opacity-60" />
      <polygon points="370,170 360,164 360,176" fill="currentColor" className="opacity-60" />
      {/* Valve body (globe) */}
      <circle cx="210" cy="170" r="42" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M168 170 L252 170 M210 128 L210 212" stroke="currentColor" strokeWidth="2" className="opacity-50" />
      {/* Plug/seat */}
      <path d="M192 178 L210 158 L228 178 Z" fill="currentColor" className="opacity-70" />
      {/* Stem */}
      <line x1="210" y1="128" x2="210" y2="78" stroke="currentColor" strokeWidth="4" />
      {/* Actuator */}
      <ellipse cx="210" cy="56" rx="48" ry="26" fill="none" stroke="currentColor" strokeWidth="3" />
      <text x="210" y="60" textAnchor="middle" fontSize="11" fill="currentColor" className="opacity-70">
        actuator
      </text>
      <text x="210" y="240" textAnchor="middle" fontSize="12" fill="currentColor" className="text-muted-foreground">
        {String(valveType).replace("_", " ")} control valve
      </text>
    </svg>
  )

  return (
    <SectionCard
      title="Valve Schematic"
      action={
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Open larger schematic">
              <Expand />
              View larger
            </Button>
          </DialogTrigger>
          <DialogContent className="grid h-[70vh] w-[88vw] max-w-[88vw] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-4 xl:w-[1100px] xl:max-w-[1100px]">
            <DialogHeader>
              <DialogTitle>Control Valve Schematic</DialogTitle>
              <DialogDescription>Illustrative valve arrangement.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
              {renderSvg("h-auto w-full min-w-[480px] text-foreground")}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2">
        {renderSvg("w-full max-w-[360px] h-auto text-foreground")}
      </div>
    </SectionCard>
  )
}
