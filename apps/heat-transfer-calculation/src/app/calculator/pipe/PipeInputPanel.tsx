"use client"

import { useFormContext, Controller } from "react-hook-form"
import { useState } from "react"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { UomInput } from "../components/UomInput"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { PIPE_SIZES, WALL_MATERIALS, INSULATION_MATERIALS } from "@/lib/materials"
import type { CalculationMetadata, RevisionRecord } from "@/types"
import { CalculationMetadataSection } from "../components/CalculationMetadataSection"
import { CalculationModeSection } from "../components/CalculationModeSection"
import type { PipeInput } from "./page"

interface PipeInputPanelProps {
  tag: string
  onTagChange: (v: string) => void
  description: string
  onDescriptionChange: (v: string) => void
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (revisionHistory: RevisionRecord[]) => void
}

export function PipeInputPanel({
  tag,
  onTagChange,
  description,
  onDescriptionChange,
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
}: PipeInputPanelProps) {
  const { control, setValue, formState: { errors } } = useFormContext<PipeInput>()
  const [nps, setNps] = useState<string>("")

  return (
    <div className="space-y-4">
      <CalculationMetadataSection
        metadata={metadata}
        onMetadataChange={onMetadataChange}
        revisionHistory={revisionHistory}
        onRevisionHistoryChange={onRevisionHistoryChange}
      />

      <CalculationModeSection activeMode="pipe" />

      <SectionCard title="Pipe Details">
        <FieldRow label="Line No." htmlFor="pipe-tag" required>
          <Input id="pipe-tag" value={tag}
            onChange={(e) => onTagChange(e.target.value)} placeholder="e.g. P-101" />
        </FieldRow>
        <FieldRow label="Description" htmlFor="pipe-desc">
          <Input id="pipe-desc" value={description}
            onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Process line" />
        </FieldRow>
      </SectionCard>

      {/* ── Pipe Geometry ── */}
      <SectionCard title="Pipe Geometry">
        <FieldRow label="Pipe Type">
          <Controller name="pipeType" control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="rectangular">Rectangular Duct</SelectItem>
                  <SelectItem value="square">Square Duct</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>

        <FieldRow label="Pipe Orientation">
          <Controller name="pipeOrientation" control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                  <SelectItem value="vertical">Vertical</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>

        {/* Nominal pipe size + schedule (circular only) */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Nominal Size" hint="Auto-fills ID/OD">
            <Select onValueChange={(val) => {
              const pipe = PIPE_SIZES.find(p => p.nps === val)
              if (pipe) {
                setNps(val)
                const sched = pipe.schedules[0]
                setValue("insideDiameter", sched.id, { shouldValidate: true })
                setValue("outsideDiameter", pipe.od, { shouldValidate: true })
                setValue("wallThickness", sched.wallThickness, { shouldValidate: true })
              }
            }}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Select size…" />
              </SelectTrigger>
              <SelectContent>
                {PIPE_SIZES.map(p => (
                  <SelectItem key={p.nps} value={p.nps}>{p.nps}&quot;</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Schedule" hint="Updates ID/wall">
            <Select onValueChange={(val) => {
              const pipe = PIPE_SIZES.find(p => p.nps === nps)
              const sched = pipe?.schedules.find(s => s.name === val)
              if (sched) {
                setValue("insideDiameter", sched.id, { shouldValidate: true })
                setValue("wallThickness", sched.wallThickness, { shouldValidate: true })
              }
            }}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="SCH 40" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCH 40">SCH 40</SelectItem>
                <SelectItem value="SCH 80">SCH 80</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Controller name="insideDiameter" control={control}
            render={({ field }) => (
              <FieldRow label="Inside Diameter" required unit="mm">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
          <Controller name="outsideDiameter" control={control}
            render={({ field }) => (
              <FieldRow label="Outside Diameter" unit="mm">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
        </div>

        <Controller name="pipeLength" control={control}
          render={({ field }) => (
            <FieldRow label="Pipe Length" required unit="m">
              <Input type="number" step="any"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            </FieldRow>
          )}
        />
      </SectionCard>

      {/* ── Fluid ── */}
      <SectionCard title="Fluid & Operating Conditions">
        <div className="grid grid-cols-2 gap-3">
          <Controller name="flowRate" control={control}
            render={({ field }) => (
              <FieldRow label="Flow Rate" required unit="kg/h">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
          <Controller name="inletTemp" control={control}
            render={({ field }) => (
              <FieldRow label="Inlet Temperature" required unit="°C">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Controller name="ambientTemp" control={control}
            render={({ field }) => (
              <FieldRow label="Ambient Temperature" required unit="°C">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
          <Controller name="windSpeed" control={control}
            render={({ field }) => (
              <FieldRow label="Wind Speed" unit="m/s">
                <Input type="number" step="any"
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
        </div>
      </SectionCard>

      {/* ── Fluid Properties ── */}
      <SectionCard title="Fluid Properties">
        <div className="grid grid-cols-2 gap-3">
          <Controller name="fluidDensity" control={control}
            render={({ field }) => (
              <FieldRow label="Density" required unit="kg/m³" hint="Water ≈ 1000">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
          <Controller name="fluidSpecificHeat" control={control}
            render={({ field }) => (
              <FieldRow label="Specific Heat" required unit="J/(kg·K)" hint="Water ≈ 4180">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Controller name="fluidViscosity" control={control}
            render={({ field }) => (
              <FieldRow label="Dynamic Viscosity" required unit="Pa·s" hint="Water ≈ 0.001">
                <Input type="number" step="0.000001"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
          <Controller name="fluidThermalConductivity" control={control}
            render={({ field }) => (
              <FieldRow label="Thermal Conductivity" required unit="W/(m·K)" hint="Water ≈ 0.6">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
        </div>
      </SectionCard>

      {/* ── Wall ── */}
      <SectionCard title="Wall & Insulation">
        <FieldRow label="Wall Material" hint="Auto-fills conductivity">
          <Select onValueChange={(val) => {
            const mat = WALL_MATERIALS.find(m => m.name === val)
            if (mat && mat.k > 0) {
              setValue("wallConductivity", mat.k, { shouldValidate: true })
              setValue("surfaceEmissivity", mat.emissivity, { shouldValidate: true })
            }
          }}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Select material…" />
            </SelectTrigger>
            <SelectContent>
              {WALL_MATERIALS.map(m => (
                <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <Controller name="wallThickness" control={control}
            render={({ field }) => (
              <FieldRow label="Wall Thickness" unit="mm">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
          <Controller name="wallConductivity" control={control}
            render={({ field }) => (
              <FieldRow label="Wall Conductivity" required unit="W/(m·K)">
                <Input type="number" step="any"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
        </div>
        <FieldRow label="Insulation Material" hint="Auto-fills conductivity">
          <Select onValueChange={(val) => {
            const mat = INSULATION_MATERIALS.find(m => m.name === val)
            if (mat) {
              setValue("insulationConductivity", mat.k, { shouldValidate: true })
              if (mat.name === "None") setValue("insulationThickness", 0, { shouldValidate: true })
            }
          }}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Select insulation…" />
            </SelectTrigger>
            <SelectContent>
              {INSULATION_MATERIALS.map(m => (
                <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <Controller name="insulationThickness" control={control}
            render={({ field }) => (
              <FieldRow label="Insulation Thickness" unit="mm" hint="0 = none">
                <Input type="number" step="any"
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
          <Controller name="insulationConductivity" control={control}
            render={({ field }) => (
              <FieldRow label="Insulation k" unit="W/(m·K)">
                <Input type="number" step="any"
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
        </div>
      </SectionCard>

      {/* ── Surface ── */}
      <SectionCard title="Surface Properties">
        <Controller name="surfaceEmissivity" control={control}
          render={({ field }) => (
            <FieldRow label="Emissivity" unit="—" hint="Oxidized steel ≈ 0.85">
              <Input type="number" step="0.01" min={0} max={1}
                value={field.value ?? 0.85}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.85)}
              />
            </FieldRow>
          )}
        />
      </SectionCard>
    </div>
  )
}
