'use client'

import { useFormContext } from 'react-hook-form'
import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import { UomInput } from '@/app/calculator/components/UomInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EquipmentType } from '@/types'
import type { CalculationInput } from '@/types'

export function SuctionSection() {
  const { watch, setValue } = useFormContext<CalculationInput>()
  const sourceType = watch('suctionSourceType') ?? EquipmentType.VESSEL

  return (
    <SectionCard title="Suction Conditions" collapsible defaultOpen={true}>
      <FieldRow label="Source Equipment Type" htmlFor="suctionSourceType">
        <Select
          value={sourceType}
          onValueChange={(v) => setValue('suctionSourceType', v as EquipmentType, { shouldDirty: true })}
        >
          <SelectTrigger id="suctionSourceType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(EquipmentType).map((et) => (
              <SelectItem key={et} value={et}>{et}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Source Vessel Pressure" htmlFor="suctionSourcePressure">
        <UomInput name="suctionSourcePressure" category="pressure" id="suctionSourcePressure" placeholder="e.g. 101.325" />
      </FieldRow>

      <FieldRow label="Liquid Level / Elevation Above Pump" htmlFor="suctionElevation" hint="Positive = source above pump (flooded), negative = pump above source">
        <UomInput name="suctionElevation" category="length" id="suctionElevation" placeholder="e.g. 2.5" />
      </FieldRow>

      <FieldRow label="Line & Fitting Losses" htmlFor="suctionLineLoss">
        <UomInput name="suctionLineLoss" category="absolutePressure" id="suctionLineLoss" placeholder="e.g. 5.0" />
      </FieldRow>

      <FieldRow label="Suction Strainer Loss" htmlFor="suctionStrainerLoss">
        <UomInput name="suctionStrainerLoss" category="absolutePressure" id="suctionStrainerLoss" placeholder="e.g. 15.0" />
      </FieldRow>

      <FieldRow label="Other Suction Losses" htmlFor="suctionOtherLoss">
        <UomInput name="suctionOtherLoss" category="absolutePressure" id="suctionOtherLoss" placeholder="e.g. 0" />
      </FieldRow>
    </SectionCard>
  )
}
