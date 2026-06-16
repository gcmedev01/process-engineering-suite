'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import { UomInput } from '@/app/calculator/components/UomInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EquipmentType } from '@/types'
import type { CalculationInput } from '@/types'

export function DischargeSection() {
  const { register, watch, setValue } = useFormContext<CalculationInput>()
  const useRecommendedCv = watch('dischargeControlValveDp') === undefined
  const destType = watch('dischargeDestType') ?? EquipmentType.VESSEL

  return (
    <SectionCard title="Discharge Conditions" collapsible defaultOpen={true}>
      <FieldRow label="Destination Equipment Type" htmlFor="dischargeDestType">
        <Select
          value={destType}
          onValueChange={(v) => setValue('dischargeDestType', v as EquipmentType, { shouldDirty: true })}
        >
          <SelectTrigger id="dischargeDestType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(EquipmentType).map((et) => (
              <SelectItem key={et} value={et}>{et}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Destination Vessel Pressure" htmlFor="dischargeDestPressure">
        <UomInput name="dischargeDestPressure" category="pressure" id="dischargeDestPressure" placeholder="e.g. 500" />
      </FieldRow>

      <FieldRow label="Elevation Difference (Discharge – Suction)" htmlFor="dischargeElevation" hint="Net elevation from pump to highest point">
        <UomInput name="dischargeElevation" category="length" id="dischargeElevation" placeholder="e.g. 15.0" />
      </FieldRow>

      <FieldRow label="Equipment ΔP (heat exchangers, vessels)" htmlFor="dischargeEquipmentDp">
        <UomInput name="dischargeEquipmentDp" category="absolutePressure" id="dischargeEquipmentDp" placeholder="e.g. 100" />
      </FieldRow>

      <FieldRow label="Line & Fitting Losses" htmlFor="dischargeLineLoss">
        <UomInput name="dischargeLineLoss" category="absolutePressure" id="dischargeLineLoss" placeholder="e.g. 30" />
      </FieldRow>

      <FieldRow label="Flow Element ΔP (orifice, flowmeter)" htmlFor="dischargeFlowElementDp">
        <UomInput name="dischargeFlowElementDp" category="absolutePressure" id="dischargeFlowElementDp" placeholder="e.g. 25" />
      </FieldRow>

      <FieldRow
        label="Control Valve ΔP"
        htmlFor="dischargeControlValveDp"
        hint="Leave blank to use the recommended value from CV section"
      >
        <UomInput name="dischargeControlValveDp" category="absolutePressure" id="dischargeControlValveDp" placeholder="Blank = recommended" />
      </FieldRow>

      <FieldRow label="Design Margin" htmlFor="dischargeDesignMargin" hint="Additional safety margin on discharge side">
        <UomInput name="dischargeDesignMargin" category="absolutePressure" id="dischargeDesignMargin" placeholder="e.g. 50" />
      </FieldRow>

      <FieldRow label="Existing System" hint="Check if revamping an existing system (pump curve-based approach)">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register('isExistingSystem')}
            className="h-4 w-4"
          />
          Existing system (not new installation)
        </label>
      </FieldRow>
    </SectionCard>
  )
}
