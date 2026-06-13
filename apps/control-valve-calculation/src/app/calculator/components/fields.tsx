"use client"

/**
 * RHF-bound form field helpers used across the control-valve input sections.
 * Numbers store as plain numbers in the chosen unit system (no UoM conversion).
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
import { FieldRow } from "./FieldRow"
import type { CalculationInput } from "@/types"

type Name = FieldPath<CalculationInput>

export function NumberField({
  name,
  label,
  unit,
  required,
  placeholder,
  hint,
}: {
  name: Name
  label: string
  unit?: string
  required?: boolean
  placeholder?: string
  hint?: string
}) {
  const { control } = useFormContext<CalculationInput>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const v = field.value
        const display = typeof v === "number" && Number.isFinite(v) ? v : ""
        return (
          <FieldRow label={label} unit={unit} required={required} hint={hint} error={fieldState.error?.message}>
            <Input
              type="number"
              step="any"
              placeholder={placeholder}
              value={display as number | ""}
              onChange={(e) => {
                const raw = parseFloat(e.target.value)
                field.onChange(Number.isNaN(raw) ? undefined : raw)
              }}
              onBlur={field.onBlur}
            />
          </FieldRow>
        )
      }}
    />
  )
}

export function TextField({
  name,
  label,
  required,
  placeholder,
}: {
  name: Name
  label: string
  required?: boolean
  placeholder?: string
}) {
  const { control } = useFormContext<CalculationInput>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldRow label={label} required={required} error={fieldState.error?.message}>
          <Input
            placeholder={placeholder}
            value={(field.value as string) ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        </FieldRow>
      )}
    />
  )
}

export function EnumField({
  name,
  label,
  options,
  required,
}: {
  name: Name
  label: string
  options: { value: string; label: string }[]
  required?: boolean
}) {
  const { control } = useFormContext<CalculationInput>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldRow label={label} required={required} error={fieldState.error?.message}>
          <Select value={(field.value as string) ?? ""} onValueChange={field.onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      )}
    />
  )
}
