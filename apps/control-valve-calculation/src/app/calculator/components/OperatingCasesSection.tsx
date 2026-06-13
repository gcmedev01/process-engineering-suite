"use client"

import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "./SectionCard"
import { EnumField } from "./fields"
import { UomInput } from "./UomInput"
import type { CvUomCategory } from "@/lib/uom"
import type { CalculationInput, FlowMode, OperatingCase } from "@/types"

const CASE_NAMES = [
  { value: "min", label: "Min" },
  { value: "normal", label: "Normal" },
  { value: "max", label: "Max" },
  { value: "design", label: "Design" },
  { value: "custom", label: "Custom" },
]

const FLOW_MODES = [
  { value: "volumetric_standard", label: "Volumetric (standard)" },
  { value: "volumetric_actual", label: "Volumetric (actual)" },
  { value: "mass", label: "Mass" },
]

function flowCategory(mode: FlowMode): CvUomCategory {
  if (mode === "mass") return "massFlow"
  if (mode === "volumetric_standard") return "ventRate"
  return "volumeFlow"
}

const newCase = (caseName: OperatingCase["caseName"]): OperatingCase => ({
  caseName,
  flowMode: "volumetric_actual",
  flowRate: 0,
  P1: 0,
  P1Basis: "absolute",
  P2: 0,
  P2Basis: "absolute",
  T1: 20,
})

function CaseCard({ index, onRemove, removable }: {
  index: number
  onRemove: () => void
  removable: boolean
}) {
  const { control } = useFormContext<CalculationInput>()
  const mode = (useWatch({ control, name: `cases.${index}.flowMode` }) ?? "volumetric_actual") as FlowMode

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Case {index + 1}</span>
        {removable && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-7 px-2 text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <EnumField name={`cases.${index}.caseName`} label="Case" options={CASE_NAMES} required />
        <EnumField name={`cases.${index}.flowMode`} label="Flow mode" options={FLOW_MODES} required />
      </div>
      <UomInput name={`cases.${index}.flowRate`} category={flowCategory(mode)} label="Flow rate" required />
      <div className="grid grid-cols-2 gap-3">
        <UomInput name={`cases.${index}.P1`} category="pressure" label="Inlet pressure (P1)" required />
        <UomInput name={`cases.${index}.P2`} category="pressure" label="Outlet pressure (P2)" hint="provide P2 or ΔP" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <UomInput name={`cases.${index}.dP`} category="absolutePressure" label="Pressure drop (ΔP)" hint="provide P2 or ΔP" />
        <UomInput name={`cases.${index}.T1`} category="temperature" label="Inlet temperature (T1)" required />
      </div>
    </div>
  )
}

export function OperatingCasesSection() {
  const { control } = useFormContext<CalculationInput>()
  const { fields, append, remove } = useFieldArray({ control, name: "cases" })

  return (
    <SectionCard
      title="Operating Cases"
      action={
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => append(newCase("custom"))}>
          <Plus className="h-4 w-4" />
          Add case
        </Button>
      }
    >
      <div className="space-y-3">
        {fields.map((f, i) => (
          <CaseCard key={f.id} index={i} removable={fields.length > 1} onRemove={() => remove(i)} />
        ))}
      </div>
    </SectionCard>
  )
}
