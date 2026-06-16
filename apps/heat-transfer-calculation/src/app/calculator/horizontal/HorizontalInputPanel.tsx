"use client"

import { useFormContext, Controller } from "react-hook-form"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WALL_MATERIALS, INSULATION_MATERIALS } from "@/lib/materials"
import { HeadType } from "@/types"
import type { CalculationMetadata, HorizontalTankInput, RevisionRecord } from "@/types"
import { CalculationMetadataSection } from "../components/CalculationMetadataSection"
import { CalculationModeSection } from "../components/CalculationModeSection"

interface Props {
  tag: string
  onTagChange: (v: string) => void
  desc: string
  onDescChange: (v: string) => void
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (revisionHistory: RevisionRecord[]) => void
}

export function HorizontalInputPanel({
  tag,
  onTagChange,
  desc,
  onDescChange,
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
}: Props) {
  const { control, setValue } = useFormContext<HorizontalTankInput>()

  return (
    <div className="space-y-4">
      <CalculationMetadataSection
        metadata={metadata}
        onMetadataChange={onMetadataChange}
        revisionHistory={revisionHistory}
        onRevisionHistoryChange={onRevisionHistoryChange}
      />

      <CalculationModeSection activeMode="horizontal" />

      <SectionCard title="Tank Details">
        <FieldRow label="Tag / Equipment No." required>
          <Input value={tag} onChange={e => onTagChange(e.target.value)} placeholder="e.g. T-201" />
        </FieldRow>
        <FieldRow label="Description">
          <Input value={desc} onChange={e => onDescChange(e.target.value)} placeholder="Horizontal Storage Tank" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Tank Geometry">
        <div className="grid grid-cols-2 gap-3">
          <Controller name="insideDiameter" control={control}
            render={({ field }) => (
              <FieldRow label="Inside Diameter" required unit="mm">
                <Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FieldRow>
            )} />
          <Controller name="tankLength" control={control}
            render={({ field }) => (
              <FieldRow label="Tan-Tan Length" required unit="mm" hint="Shell length between tangent lines">
                <Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FieldRow>
            )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Head Type">
            <Controller name="headType" control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(HeadType).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
          </FieldRow>
          <Controller name="flangeWidth" control={control}
            render={({ field }) => (
              <FieldRow label="Flange Width" unit="mm" hint="Extension beyond tan line">
                <Input type="number" step="any" value={field.value ?? 0} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FieldRow>
            )} />
        </div>
        <Controller name="liquidLevel" control={control}
          render={({ field }) => (
            <FieldRow label="Liquid Level" required unit="mm" hint="From bottom of shell">
              <Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
            </FieldRow>
          )} />
      </SectionCard>

      <SectionCard title="Operating Conditions">
        <div className="grid grid-cols-2 gap-3">
          <Controller name="fluidTemp" control={control} render={({ field }) => (
            <FieldRow label="Fluid Temp" required unit="°C"><Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
          <Controller name="ambientTemp" control={control} render={({ field }) => (
            <FieldRow label="Ambient Temp" required unit="°C"><Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Controller name="windSpeed" control={control} render={({ field }) => (
            <FieldRow label="Wind Speed" unit="m/s"><Input type="number" step="any" value={field.value ?? 0} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
          <Controller name="windEnhancement" control={control} render={({ field }) => (
            <FieldRow label="Wind Enhancement" unit="—" hint="Default 1.0"><Input type="number" step="0.1" value={field.value ?? 1} onChange={e => field.onChange(parseFloat(e.target.value) || 1)} /></FieldRow>
          )} />
        </div>
      </SectionCard>

      <SectionCard title="Wall & Insulation">
        <FieldRow label="Wall Material" hint="Auto-fills k & emissivity">
          <Select onValueChange={val => { const m = WALL_MATERIALS.find(x => x.name === val); if (m) { setValue("wallConductivity", m.k); setValue("surfaceEmissivity", m.emissivity) } }}>
            <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Select material…" /></SelectTrigger>
            <SelectContent>{WALL_MATERIALS.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <Controller name="wallThickness" control={control} render={({ field }) => (
            <FieldRow label="Wall Thickness" required unit="mm"><Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
          <Controller name="wallConductivity" control={control} render={({ field }) => (
            <FieldRow label="Wall Conductivity" required unit="W/(m·K)"><Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
        </div>
        <FieldRow label="Insulation" hint="Auto-fills k">
          <Select onValueChange={val => { const m = INSULATION_MATERIALS.find(x => x.name === val); if (m) { setValue("insulationConductivity", m.k); if (m.name === "None") setValue("insulationThickness", 0) } }}>
            <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Select insulation…" /></SelectTrigger>
            <SelectContent>{INSULATION_MATERIALS.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <Controller name="insulationThickness" control={control} render={({ field }) => (
            <FieldRow label="Insulation Thickness" unit="mm"><Input type="number" step="any" value={field.value ?? 0} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
          <Controller name="insulationConductivity" control={control} render={({ field }) => (
            <FieldRow label="Insulation k" unit="W/(m·K)"><Input type="number" step="any" value={field.value ?? 0} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
        </div>
      </SectionCard>

      <SectionCard title="Fluid Properties">
        <div className="grid grid-cols-2 gap-3">
          <Controller name="fluidDensity" control={control} render={({ field }) => (
            <FieldRow label="Density" required unit="kg/m³"><Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
          <Controller name="fluidSpecificHeat" control={control} render={({ field }) => (
            <FieldRow label="Specific Heat" required unit="J/(kg·K)"><Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Controller name="fluidViscosity" control={control} render={({ field }) => (
            <FieldRow label="Viscosity" required unit="Pa·s"><Input type="number" step="0.000001" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
          <Controller name="fluidThermalConductivity" control={control} render={({ field }) => (
            <FieldRow label="Thermal Conductivity" required unit="W/(m·K)"><Input type="number" step="any" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
          )} />
        </div>
        <Controller name="fluidExpansionCoeff" control={control} render={({ field }) => (
          <FieldRow label="Expansion Coeff." required unit="1/K"><Input type="number" step="0.000001" value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FieldRow>
        )} />
      </SectionCard>

      <SectionCard title="Surface & Ground">
        <div className="grid grid-cols-2 gap-3">
          <Controller name="surfaceEmissivity" control={control} render={({ field }) => (
            <FieldRow label="Emissivity" unit="—"><Input type="number" step="0.01" min={0} max={1} value={field.value ?? 0.85} onChange={e => field.onChange(parseFloat(e.target.value) || 0.85)} /></FieldRow>
          )} />
          <Controller name="groundTemp" control={control} render={({ field }) => (
            <FieldRow label="Ground Temp" unit="°C"><Input type="number" step="any" value={field.value ?? 25} onChange={e => field.onChange(parseFloat(e.target.value) || 25)} /></FieldRow>
          )} />
        </div>
        <Controller name="groundConductivity" control={control} render={({ field }) => (
          <FieldRow label="Ground k" unit="W/(m·K)" hint="Concrete ≈ 1.38"><Input type="number" step="any" value={field.value ?? 1.3846} onChange={e => field.onChange(parseFloat(e.target.value) || 1.3846)} /></FieldRow>
        )} />
      </SectionCard>
    </div>
  )
}
