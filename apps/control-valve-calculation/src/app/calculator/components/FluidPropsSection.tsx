"use client"

import { useFormContext, useWatch } from "react-hook-form"
import { SectionCard } from "./SectionCard"
import { EnumField, NumberField } from "./fields"
import { UomInput } from "./UomInput"
import type { CalculationInput, FluidType } from "@/types"

const FLUID_TYPES = [
  { value: "liquid", label: "Liquid" },
  { value: "gas", label: "Gas" },
  { value: "vapor", label: "Vapor" },
  { value: "steam", label: "Steam (stub)" },
  { value: "two_phase", label: "Two-phase (unsupported)" },
  { value: "slurry", label: "Slurry (unsupported)" },
  { value: "non_newtonian", label: "Non-Newtonian (unsupported)" },
]

export function FluidPropsSection() {
  const { control } = useFormContext<CalculationInput>()
  const fluidType = (useWatch({ control, name: "fluid.fluidType" }) ?? "liquid") as FluidType

  const isLiquid = fluidType === "liquid"
  const isGas = fluidType === "gas" || fluidType === "vapor"

  return (
    <SectionCard title="Fluid Properties">
      <EnumField name="fluid.fluidType" label="Fluid type" options={FLUID_TYPES} required />

      {isLiquid && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberField name="fluid.Gf" label="Specific gravity (Gf)" required />
            <UomInput name="fluid.kinematicViscosity" category="kinematicViscosity" label="Kinematic viscosity" hint="optional" />
          </div>
          <UomInput name="fluid.Pv" category="pressure" label="Vapor pressure (abs)" required />
          <UomInput name="fluid.Pc" category="pressure" label="Critical pressure (abs)" required />
          <UomInput name="fluid.upstreamDensity" category="density" label="Upstream density" hint="required for mass flow" />
        </>
      )}

      {isGas && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <NumberField name="fluid.M" label="Mol. weight (M)" unit="kg/kmol" required />
            <NumberField name="fluid.k" label="Cp/Cv (k)" required />
            <NumberField name="fluid.Z" label="Z" hint="default 1.0" />
          </div>
          <UomInput name="fluid.upstreamDensity" category="density" label="Upstream density" hint="required for mass flow / Mach" />
        </>
      )}

      {!isLiquid && !isGas && (
        <p className="text-sm text-muted-foreground">
          This fluid type is outside the standard ISA/IEC sizing method and will be reported as a
          warning only.
        </p>
      )}
    </SectionCard>
  )
}
