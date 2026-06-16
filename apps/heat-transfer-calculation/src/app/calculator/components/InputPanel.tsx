"use client"

import { useFormContext, Controller } from "react-hook-form"
import { SectionCard } from "./SectionCard"
import { CalculationMetadataSection } from "./CalculationMetadataSection"
import { CalculationModeSection } from "./CalculationModeSection"
import { FieldRow } from "./FieldRow"
import { UomInput } from "./UomInput"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { WALL_MATERIALS, INSULATION_MATERIALS, GROUND_MATERIALS } from "@/lib/materials"

interface InputPanelProps {
  metadata: CalculationMetadata
  onMetadataChange: (m: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (r: RevisionRecord[]) => void
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="space-y-4 pl-6">{children}</div>}
    </div>
  )
}

export function InputPanel({
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
}: InputPanelProps) {
  const { register, control, setValue, formState: { errors } } = useFormContext<CalculationInput>()

  return (
    <div className="space-y-4">
      <CalculationMetadataSection
        metadata={metadata}
        onMetadataChange={onMetadataChange}
        revisionHistory={revisionHistory}
        onRevisionHistoryChange={onRevisionHistoryChange}
      />

      <CalculationModeSection activeMode="storage" />

      {/* ── Tank Details ── */}
      <SectionCard title="Tank Details">
        <FieldRow label="Tag / Equipment No." htmlFor="tag" required error={errors.tag?.message}>
          <Input id="tag" {...register("tag")} placeholder="e.g. T-101" />
        </FieldRow>
        <FieldRow label="Description" htmlFor="description">
          <Input id="description" {...register("description")} placeholder="Storage Tank" />
        </FieldRow>
      </SectionCard>

      {/* ── Tank Geometry ── */}
      <SectionCard title="Tank Geometry">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="tankDiameter"
            control={control}
            render={({ field }) => (
              <FieldRow label="Diameter" required error={errors.tankDiameter?.message}>
                <UomInput name="tankDiameter" category="length" />
              </FieldRow>
            )}
          />
          <Controller
            name="tankHeight"
            control={control}
            render={({ field }) => (
              <FieldRow label="Height" required error={errors.tankHeight?.message}>
                <UomInput name="tankHeight" category="length" />
              </FieldRow>
            )}
          />
        </div>
        <Controller
          name="liquidLevel"
          control={control}
          render={({ field }) => (
            <FieldRow label="Liquid Level" required error={errors.liquidLevel?.message}
              hint="Height of liquid in the tank (0 = empty)">
              <UomInput name="liquidLevel" category="length" />
            </FieldRow>
          )}
        />
        <Controller
          name="roofHeight"
          control={control}
          render={({ field }) => (
            <FieldRow label="Cone Height" hint="Roof slope height (leave blank for flat top)">
              <UomInput name="roofHeight" category="length" />
            </FieldRow>
          )}
        />
      </SectionCard>

      {/* ── Operating Conditions ── */}
      <SectionCard title="Operating Conditions">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="fluidTemp"
            control={control}
            render={({ field }) => (
              <FieldRow label="Fluid Temperature" required error={errors.fluidTemp?.message}>
                <UomInput name="fluidTemp" category="temperature" />
              </FieldRow>
            )}
          />
          <Controller
            name="ambientTemp"
            control={control}
            render={({ field }) => (
              <FieldRow label="Ambient Temperature" required error={errors.ambientTemp?.message}>
                <UomInput name="ambientTemp" category="temperature" />
              </FieldRow>
            )}
          />
        </div>
        <Controller
          name="windSpeed"
          control={control}
          render={({ field }) => (
            <FieldRow label="Wind Speed" hint="Average wind speed at tank location">
              <UomInput name="windSpeed" category="velocity" />
            </FieldRow>
          )}
        />
        <Controller
          name="windEnhancement"
          control={control}
          render={({ field }) => (
            <FieldRow label="Wind Enhancement Factor" hint="Multiplier for external convection (default 1.0)" unit="—">
              <Input
                type="number"
                step="0.1"
                value={field.value ?? 1.0}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 1.0)}
              />
            </FieldRow>
          )}
        />
      </SectionCard>

      {/* ── Wall Construction ── */}
      <SectionCard title="Wall Construction">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="wallThickness"
            control={control}
            render={({ field }) => (
              <FieldRow label="Wall Thickness" required error={errors.wallThickness?.message}>
                <UomInput name="wallThickness" category="length" />
              </FieldRow>
            )}
          />
          <Controller
            name="wallConductivity"
            control={control}
            render={({ field }) => (
              <FieldRow label="Wall Conductivity" required error={errors.wallConductivity?.message}
                hint="Carbon steel ≈ 45 W/(m·K)">
                <UomInput name="wallConductivity" category="thermalConductivity" />
              </FieldRow>
            )}
          />
        </div>
        {/* Wall material preset */}
        <FieldRow label="Wall Material" hint="Auto-fills conductivity & emissivity">
          <Select
            onValueChange={(val) => {
              const mat = WALL_MATERIALS.find(m => m.name === val)
              if (mat) {
                setValue("wallConductivity", mat.k, { shouldValidate: true })
                setValue("surfaceEmissivity", mat.emissivity, { shouldValidate: true })
              }
            }}
          >
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Select wall material…" />
            </SelectTrigger>
            <SelectContent>
              {WALL_MATERIALS.map((m) => (
                <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="insulationThickness"
            control={control}
            render={({ field }) => (
              <FieldRow label="Insulation Thickness" hint="0 = no insulation">
                <UomInput name="insulationThickness" category="length" />
              </FieldRow>
            )}
          />
          <Controller
            name="insulationConductivity"
            control={control}
            render={({ field }) => (
              <FieldRow label="Insulation Conductivity"
                hint="Mineral wool ≈ 0.04 W/(m·K)"
                error={errors.insulationConductivity?.message}>
                <UomInput name="insulationConductivity" category="thermalConductivity" />
              </FieldRow>
            )}
          />
        </div>
        {/* Insulation material preset */}
        <FieldRow label="Insulation Material" hint="Auto-fills conductivity">
          <Select
            onValueChange={(val) => {
              const mat = INSULATION_MATERIALS.find(m => m.name === val)
              if (mat) {
                setValue("insulationConductivity", mat.k, { shouldValidate: true })
                if (mat.name === "None") {
                  setValue("insulationThickness", 0, { shouldValidate: true })
                }
              }
            }}
          >
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Select insulation…" />
            </SelectTrigger>
            <SelectContent>
              {INSULATION_MATERIALS.map((m) => (
                <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      </SectionCard>

      {/* ── Fluid Properties ── */}
      <SectionCard title="Fluid Properties">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="fluidDensity"
            control={control}
            render={({ field }) => (
              <FieldRow label="Density" required error={errors.fluidDensity?.message}
                hint="Water ≈ 1000 kg/m³">
                <UomInput name="fluidDensity" category="density" />
              </FieldRow>
            )}
          />
          <Controller
            name="fluidSpecificHeat"
            control={control}
            render={({ field }) => (
              <FieldRow label="Specific Heat" required error={errors.fluidSpecificHeat?.message}
                hint="Water ≈ 4180 J/(kg·K)">
                <UomInput name="fluidSpecificHeat" category="specificHeat" />
              </FieldRow>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="fluidViscosity"
            control={control}
            render={({ field }) => (
              <FieldRow label="Dynamic Viscosity" required error={errors.fluidViscosity?.message}
                hint="Water at 20°C ≈ 0.001 Pa·s">
                <UomInput name="fluidViscosity" category="viscosity" />
              </FieldRow>
            )}
          />
          <Controller
            name="fluidThermalConductivity"
            control={control}
            render={({ field }) => (
              <FieldRow label="Thermal Conductivity" required error={errors.fluidThermalConductivity?.message}
                hint="Water ≈ 0.6 W/(m·K)">
                <UomInput name="fluidThermalConductivity" category="thermalConductivity" />
              </FieldRow>
            )}
          />
        </div>
        <Controller
          name="fluidExpansionCoeff"
          control={control}
          render={({ field }) => (
            <FieldRow label="Thermal Expansion Coeff." required error={errors.fluidExpansionCoeff?.message}
              hint="Water ≈ 2.1×10⁻⁴ 1/K">
              <UomInput name="fluidExpansionCoeff" category="expansionCoeff" />
            </FieldRow>
          )}
        />
      </SectionCard>

      {/* ── Vapor Properties (collapsible) ── */}
      <SectionCard title="Vapor/Gas Properties">
        <CollapsibleSection title="Advanced (defaults to air properties)" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="vaporDensity"
              control={control}
              render={({ field }) => (
                <FieldRow label="Density" hint="Air ≈ 1.0 kg/m³ at 80°C">
                  <UomInput name="vaporDensity" category="density" />
                </FieldRow>
              )}
            />
            <Controller
              name="vaporSpecificHeat"
              control={control}
              render={({ field }) => (
                <FieldRow label="Specific Heat" hint="Air ≈ 1009 J/(kg·K)">
                  <UomInput name="vaporSpecificHeat" category="specificHeat" />
                </FieldRow>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="vaporViscosity"
              control={control}
              render={({ field }) => (
                <FieldRow label="Viscosity" hint="Air ≈ 2.1×10⁻⁵ Pa·s">
                  <UomInput name="vaporViscosity" category="viscosity" />
                </FieldRow>
              )}
            />
            <Controller
              name="vaporThermalConductivity"
              control={control}
              render={({ field }) => (
                <FieldRow label="Thermal Conductivity" hint="Air ≈ 0.03 W/(m·K)">
                  <UomInput name="vaporThermalConductivity" category="thermalConductivity" />
                </FieldRow>
              )}
            />
          </div>
          <Controller
            name="vaporExpansionCoeff"
            control={control}
            render={({ field }) => (
              <FieldRow label="Expansion Coeff." hint="Ideal gas ≈ 3×10⁻³ 1/K">
                <UomInput name="vaporExpansionCoeff" category="expansionCoeff" />
              </FieldRow>
            )}
          />
        </CollapsibleSection>
      </SectionCard>

      {/* ── Surface Properties ── */}
      <SectionCard title="Surface Properties">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="surfaceEmissivity"
            control={control}
            render={({ field }) => (
              <FieldRow label="Wall Emissivity" required error={errors.surfaceEmissivity?.message}
                hint="Oxidized steel ≈ 0.85">
                <Input type="number" step="0.01" min={0} max={1}
                  value={field.value ?? 0.85}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FieldRow>
            )}
          />
          <Controller
            name="roofEmissivity"
            control={control}
            render={({ field }) => (
              <FieldRow label="Roof Emissivity" hint="Falls back to wall emissivity">
                <Input type="number" step="0.01" min={0} max={1}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FieldRow>
            )}
          />
        </div>
      </SectionCard>

      {/* ── Fouling & Ground (collapsible) ── */}
      <SectionCard title="Fouling & Ground">
        <CollapsibleSection title="Advanced" defaultOpen={false}>
          <p className="text-xs text-muted-foreground mb-1">Fouling HTC (higher = cleaner surface)</p>
          <div className="grid grid-cols-2 gap-3">
            <Controller name="foulingDryWall" control={control}
              render={({ field }) => (
                <FieldRow label="Dry Wall" unit="W/(m²·K)">
                  <Input type="number" step="any"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FieldRow>
              )}
            />
            <Controller name="foulingWetWall" control={control}
              render={({ field }) => (
                <FieldRow label="Wet Wall" unit="W/(m²·K)">
                  <Input type="number" step="any"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FieldRow>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller name="foulingRoof" control={control}
              render={({ field }) => (
                <FieldRow label="Roof" unit="W/(m²·K)">
                  <Input type="number" step="any"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FieldRow>
              )}
            />
            <Controller name="foulingFloor" control={control}
              render={({ field }) => (
                <FieldRow label="Floor" unit="W/(m²·K)">
                  <Input type="number" step="any"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FieldRow>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Controller name="groundTemp" control={control}
              render={({ field }) => (
                <FieldRow label="Ground Temperature" hint="Default 25°C">
                  <UomInput name="groundTemp" category="temperature" />
                </FieldRow>
              )}
            />
            <Controller name="groundConductivity" control={control}
              render={({ field }) => (
                <FieldRow label="Ground Conductivity" hint="Concrete ≈ 1.38 W/(m·K)">
                  <UomInput name="groundConductivity" category="thermalConductivity" />
                </FieldRow>
              )}
            />
          </div>
          {/* Ground material preset */}
          <div className="mt-3">
            <FieldRow label="Ground Material" hint="Auto-fills conductivity">
              <Select
                onValueChange={(val) => {
                  const mat = GROUND_MATERIALS.find(m => m.name === val)
                  if (mat) {
                    setValue("groundConductivity", mat.k, { shouldValidate: true })
                  }
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select ground type…" />
                </SelectTrigger>
                <SelectContent>
                  {GROUND_MATERIALS.map((m) => (
                    <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
        </CollapsibleSection>
      </SectionCard>
    </div>
  )
}
