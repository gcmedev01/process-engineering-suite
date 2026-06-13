"use client"

import { SectionCard } from "./SectionCard"
import { EnumField, NumberField } from "./fields"
import { UomInput } from "./UomInput"

const VALVE_TYPES = [
  { value: "globe", label: "Globe" },
  { value: "globe_angle", label: "Globe (angle)" },
  { value: "ball", label: "Ball" },
  { value: "butterfly", label: "Butterfly" },
  { value: "rotary_plug", label: "Rotary plug" },
  { value: "special", label: "Special" },
]

const FLOW_CHARS = [
  { value: "linear", label: "Linear" },
  { value: "equal_percentage", label: "Equal percentage" },
  { value: "quick_opening", label: "Quick opening" },
]

const FITTINGS = [
  { value: "none", label: "None" },
  { value: "reducers", label: "Reducers" },
  { value: "expanders", label: "Expanders" },
  { value: "custom", label: "Custom" },
]

export function ValveConfigSection() {
  return (
    <SectionCard title="Valve Configuration">
      <div className="grid grid-cols-2 gap-3">
        <EnumField name="valve.valveType" label="Valve type" options={VALVE_TYPES} required />
        <EnumField
          name="valve.flowBasis"
          label="Coefficient basis"
          options={[
            { value: "Cv", label: "Cv" },
            { value: "Kv", label: "Kv" },
          ]}
          required
        />
      </div>
      <EnumField name="valve.flowCharacteristic" label="Flow characteristic" options={FLOW_CHARS} required />
      <UomInput name="valve.valveSize" category="length" label="Valve size" required />
      <div className="grid grid-cols-2 gap-3">
        <UomInput name="valve.lineSizeUpstream" category="length" label="Line size (upstream)" required />
        <UomInput name="valve.lineSizeDownstream" category="length" label="Line size (downstream)" required />
      </div>
      <EnumField name="valve.fittings" label="Fittings" options={FITTINGS} required />
      <div className="grid grid-cols-3 gap-3">
        <NumberField name="valve.FL" label="FL" hint="optional" />
        <NumberField name="valve.xT" label="xT" hint="optional" />
        <NumberField name="valve.Fd" label="Fd" hint="optional" />
      </div>
      <p className="text-xs text-muted-foreground">
        Leave FL/xT/Fd blank to use typical defaults for the selected valve type (confirm with the
        manufacturer).
      </p>
    </SectionCard>
  )
}
