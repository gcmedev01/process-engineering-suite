'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SectionCard } from '@/app/calculator/components/SectionCard'
import { FieldRow } from '@/app/calculator/components/FieldRow'
import type { CalculationInput } from '@/types'
import { PumpType, PdSubtype } from '@/types'

export function PumpDetailsSection() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CalculationInput>()

  const pumpType = watch('pumpType')
  const isPD = pumpType === PumpType.POSITIVE_DISPLACEMENT

  return (
    <SectionCard title="Pump Details" collapsible defaultOpen={true}>
      <FieldRow label="Tag / Equipment No." htmlFor="tag" required error={errors.tag?.message}>
        <Input id="tag" {...register('tag')} placeholder="e.g. P-101A" />
      </FieldRow>

      <FieldRow label="Description" htmlFor="description">
        <Input id="description" {...register('description')} placeholder="e.g. Crude Feed Pump" />
      </FieldRow>

      <FieldRow label="Pump Type" required>
        <div className="flex gap-2">
          {Object.values(PumpType).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setValue('pumpType', pt)}
              className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                pumpType === pt
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-muted hover:bg-muted/40'
              }`}
            >
              {pt}
            </button>
          ))}
        </div>
      </FieldRow>

      {isPD && (
        <>
          <FieldRow label="PD Subtype">
            <Select
              value={watch('pdSubtype') ?? ''}
              onValueChange={(v) => setValue('pdSubtype', v as PdSubtype)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subtype…" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PdSubtype).map((sub) => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Pump Speed" htmlFor="pumpSpeed" unit="rpm">
            <Input
              id="pumpSpeed"
              type="number"
              step="any"
              {...register('pumpSpeed', { valueAsNumber: true })}
              placeholder="e.g. 60"
            />
          </FieldRow>

          <FieldRow label="Compressibility Factor K" htmlFor="compressibilityFactor">
            <Input
              id="compressibilityFactor"
              type="number"
              step="any"
              {...register('compressibilityFactor', { valueAsNumber: true })}
              placeholder="e.g. 0.025"
            />
          </FieldRow>
        </>
      )}
    </SectionCard>
  )
}
