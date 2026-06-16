"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import type { CalculationInput } from "@/types"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { ConfigSelector } from "../components/ConfigSelector"
import { UomInput } from "../components/UomInput"

export function TankDetailSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CalculationInput>()

  return (
    <SectionCard title="Tank Details">
      {/* Identification */}
      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Tag / Equipment No."
          htmlFor="tankNumber"
          required
          error={errors.tankNumber?.message}
          className="col-span-1"
        >
          <Input
            id="tankNumber"
            placeholder="e.g. T-101"
            {...register("tankNumber")}
          />
        </FieldRow>
        <FieldRow
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
          className="col-span-1"
        >
          <Input
            id="description"
            placeholder="Optional description"
            {...register("description")}
          />
        </FieldRow>
      </div>

      {/* Geometry */}
      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Diameter (D)"
          htmlFor="diameter"
          required
          error={errors.diameter?.message}
        >
          <UomInput
            name="diameter"
            category="length"
            id="diameter"
            placeholder="e.g. 24000"
          />
        </FieldRow>
        <FieldRow
          label="Height (TL–TL)"
          htmlFor="height"
          required
          error={errors.height?.message}
        >
          <UomInput
            name="height"
            category="length"
            id="height"
            placeholder="e.g. 17500"
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Latitude"
          htmlFor="latitude"
          unit="°"
          required
          error={errors.latitude?.message}
          hint="[0°, 90°] — for thermal factors"
        >
          <Input
            id="latitude"
            type="number"
            step="any"
            placeholder="e.g. 12.7"
            {...register("latitude", { valueAsNumber: true })}
          />
        </FieldRow>
        <FieldRow
          label="Design Pressure"
          htmlFor="designPressure"
          required
          error={errors.designPressure?.message}
          hint="-101.3 to 103.4 kPag (base units)"
        >
          <UomInput
            name="designPressure"
            category="gaugePressure"
            id="designPressure"
            placeholder="e.g. 5"
          />
        </FieldRow>
      </div>

      {/* Configuration */}
      <ConfigSelector />
    </SectionCard>
  )
}
