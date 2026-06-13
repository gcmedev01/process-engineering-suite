"use client"

import { SectionCard } from "./SectionCard"
import { TextField } from "./fields"

export function IdentificationSection() {
  return (
    <SectionCard title="Identification">
      <TextField name="tag" label="Valve tag" placeholder="e.g. FCV-101" required />
      <TextField name="description" label="Description" placeholder="Service description" />
    </SectionCard>
  )
}
