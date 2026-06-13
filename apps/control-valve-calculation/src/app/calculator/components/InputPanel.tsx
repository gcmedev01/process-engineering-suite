"use client"

import { CalculationMetadataSection } from "./CalculationMetadataSection"
import { IdentificationSection } from "./IdentificationSection"
import { ValveConfigSection } from "./ValveConfigSection"
import { FluidPropsSection } from "./FluidPropsSection"
import { OperatingCasesSection } from "./OperatingCasesSection"
import type { CalculationMetadata, RevisionRecord } from "@/types"

interface Props {
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (revisionHistory: RevisionRecord[]) => void
}

export function InputPanel({
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
}: Props) {
  return (
    <div className="space-y-4">
      <CalculationMetadataSection
        metadata={metadata}
        onMetadataChange={onMetadataChange}
        revisionHistory={revisionHistory}
        onRevisionHistoryChange={onRevisionHistoryChange}
      />
      <IdentificationSection />
      <ValveConfigSection />
      <FluidPropsSection />
      <OperatingCasesSection />
    </div>
  )
}
