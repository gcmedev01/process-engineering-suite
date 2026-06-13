"use client"

/**
 * UomInput — numeric input with an inline, independent unit selector.
 * Form state always stores the base unit value; display converts to the user's
 * chosen unit per category. Changing the unit dropdown updates the preference
 * (and re-displays) but never mutates the stored base value.
 */
import { Controller, useFormContext, type FieldPath } from "react-hook-form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { convertUnit } from "@eng-suite/physics"
import { UOM_LABEL, UOM_OPTIONS, CV_BASE_UNITS, type CvUomCategory } from "@/lib/uom"
import { useUomStore } from "@/lib/store/uomStore"
import { FieldRow } from "./FieldRow"
import type { CalculationInput } from "@/types"

interface UomInputProps {
  name: FieldPath<CalculationInput>
  category: CvUomCategory
  label: string
  required?: boolean
  hint?: string
  placeholder?: string
  /** Override the error message from fieldState — use for cross-field errors that zodResolver may not propagate to all paths. */
  errorOverride?: string
  /** Called with the new base-unit value (or NaN when cleared) after each change. */
  onValueChange?: (value: number) => void
}

export function UomInput({ name, category, label, required, hint, placeholder, errorOverride, onValueChange }: UomInputProps) {
  const { control } = useFormContext<CalculationInput>()
  const { units, setUnit } = useUomStore()
  const baseUnit = CV_BASE_UNITS[category]
  const displayUnit = units[category] ?? baseUnit

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const numeric = typeof field.value === "number" ? field.value : NaN
        const display = Number.isFinite(numeric) ? convertUnit(numeric, baseUnit, displayUnit) : ""

        const unitSelect = (
          <Select value={displayUnit} onValueChange={(u) => setUnit(category, u)}>
            <SelectTrigger className="h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap">
              <SelectValue>{UOM_LABEL[displayUnit] ?? displayUnit}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {UOM_OPTIONS[category].map((u) => (
                <SelectItem key={u} value={u} className="text-xs">
                  {UOM_LABEL[u] ?? u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

        return (
          <FieldRow
            label={label}
            required={required}
            hint={hint}
            error={errorOverride ?? fieldState.error?.message}
            unit={unitSelect}
          >
            <Input
              type="number"
              step="any"
              placeholder={placeholder}
              value={display === "" ? "" : Number(display.toFixed(6))}
              onChange={(e) => {
                const raw = parseFloat(e.target.value)
                const baseValue = Number.isNaN(raw) ? NaN : convertUnit(raw, displayUnit, baseUnit)
                field.onChange(baseValue)
                onValueChange?.(baseValue)
              }}
              onBlur={field.onBlur}
            />
          </FieldRow>
        )
      }}
    />
  )
}
