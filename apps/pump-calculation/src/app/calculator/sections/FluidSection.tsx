'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import { UomInput } from '@/app/calculator/components/UomInput'
import type { CalculationInput } from '@/types'

export function FluidSection() {
  const { register, formState: { errors } } = useFormContext<CalculationInput>()

  return (
    <SectionCard title="Fluid Data" collapsible defaultOpen={true}>
      <FieldRow label="Fluid Name" htmlFor="fluidName">
        <Input id="fluidName" {...register('fluidName')} placeholder="e.g. Crude Oil, Water" />
      </FieldRow>

      <FieldRow label="Design Flow Rate" htmlFor="flowDesign" required error={errors.flowDesign?.message}>
        <UomInput name="flowDesign" category="volumeFlow" id="flowDesign" placeholder="e.g. 100" />
      </FieldRow>

      <FieldRow label="Operating Temperature" htmlFor="temperature">
        <UomInput name="temperature" category="temperature" id="temperature" placeholder="e.g. 60" />
      </FieldRow>

      <FieldRow label="Specific Gravity (SG)" htmlFor="sg" required error={errors.sg?.message} hint="Relative to water at 4°C">
        <Input
          id="sg"
          type="number"
          step="any"
          {...register('sg', { valueAsNumber: true })}
          placeholder="e.g. 0.85"
        />
      </FieldRow>

      <FieldRow label="Vapour Pressure" htmlFor="vapourPressure" error={errors.vapourPressure?.message}>
        <UomInput name="vapourPressure" category="absolutePressure" id="vapourPressure" placeholder="e.g. 15.0" />
      </FieldRow>

      <FieldRow label="Viscosity" htmlFor="viscosity">
        <UomInput name="viscosity" category="viscosity" id="viscosity" placeholder="e.g. 5.0" />
      </FieldRow>
    </SectionCard>
  )
}
