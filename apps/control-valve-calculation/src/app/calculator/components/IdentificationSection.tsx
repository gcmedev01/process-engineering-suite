"use client"

import { SectionCard } from "./SectionCard"
import { TextField } from "./fields"

export function IdentificationSection() {
  return (
    <SectionCard title="Valve Details">
      <TextField name="tag" label="Tag / Instrument No." placeholder="e.g. FCV-101" required />
      <TextField name="description" label="Description" placeholder="Service description" />
    </SectionCard>
  )
}
