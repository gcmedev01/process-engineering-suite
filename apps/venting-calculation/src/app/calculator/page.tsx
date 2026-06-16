"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { useCalculation } from "@/lib/hooks/useCalculation"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"
import { TankConfiguration } from "@/types"
import type { Resolver } from "react-hook-form"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ActionMenu } from "./components/ActionMenu"
import { CalculatorToolbar } from "./components/CalculatorToolbar"

// ─── Default form values ───────────────────────────────────────────────────────

const createDefaultValues = () => ({
  tankNumber: "",
  description: "",
  diameter: undefined,
  height: undefined,
  latitude: undefined,
  designPressure: undefined,
  tankConfiguration: TankConfiguration.BARE_METAL,
  insulationThickness: undefined,
  insulationConductivity: undefined,
  insideHeatTransferCoeff: undefined,
  insulatedSurfaceArea: undefined,
  avgStorageTemp: undefined,
  vapourPressure: undefined,
  flashBoilingPointType: "FP" as const,
  flashBoilingPoint: undefined,
  latentHeat: undefined,
  relievingTemperature: undefined,
  molecularMass: undefined,
  incomingStreams: [] as CalculationInput["incomingStreams"],
  outgoingStreams: [] as CalculationInput["outgoingStreams"],
  drainLineSize: undefined,
  maxHeightAboveDrain: undefined,
  apiEdition: "7TH" as const,
})

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const form = useForm<CalculationInput>({
    // Cast required because zodResolver infers stream array inputs as possibly
    // undefined (due to .default([])) which differs from CalculationInput's
    // required Stream[] — behaviour is correct at runtime.
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: createDefaultValues() as unknown as CalculationInput, // allow undefined
    mode: "onChange",
  })

  // Wire form → hook
  const { calculationResult, derivedGeometry, validationIssues } = useCalculation(form.control)

  // Track which equipment tank (if any) the user has linked to this calculation.
  // Populated by LinkTankButton and restored when loading a saved calculation.
  const [linkedEquipmentId, setLinkedEquipmentId] = useState<string | null>(null)
  const [linkedTankTag, setLinkedTankTag] = useState<string | null>(null)
  const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])
  const [clearToken, setClearToken] = useState(0)

  const handleTankLinked = (equipmentId: string | null, tankTag: string | null = null) => {
    setLinkedEquipmentId(equipmentId)
    setLinkedTankTag(equipmentId ? (tankTag ?? "Linked Tank") : null)
  }

  const handleClear = () => {
    form.reset(createDefaultValues() as unknown as CalculationInput, { keepDefaultValues: false })
    form.clearErrors()
    handleTankLinked(null, null)
    setCalculationMetadata(EMPTY_METADATA)
    setRevisionHistory([])
    setClearToken((value) => value + 1)
  }

  return (
    // FormProvider wraps the entire page so ExportButton (in the header)
    // can access form values via useFormContext.
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        <CalculatorToolbar
          actions={(
            <ActionMenu
              onTankLinked={handleTankLinked}
              linkedTag={linkedTankTag}
              linkedEquipmentId={linkedEquipmentId}
              clearToken={clearToken}
              onClear={handleClear}
              calculationMetadata={calculationMetadata}
              revisionHistory={revisionHistory}
              onCalculationLoaded={(metadata, loadedRevisionHistory) => {
                setCalculationMetadata(metadata)
                setRevisionHistory(loadedRevisionHistory)
              }}
              calculationResult={calculationResult}
              derivedGeometry={derivedGeometry}
            />
          )}
        />

        {/* Two-column layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Left — Inputs */}
            <div>
              <InputPanel
                metadata={calculationMetadata}
                onMetadataChange={setCalculationMetadata}
                revisionHistory={revisionHistory}
                onRevisionHistoryChange={setRevisionHistory}
                derivedGeometry={derivedGeometry}
              />
            </div>

            {/* Right — Results */}
            <div>
              <ResultsPanel
                calculationResult={calculationResult}
                validationIssues={validationIssues}
                derivedGeometry={derivedGeometry}
              />
            </div>
          </div>
        </div>
      </main>
    </FormProvider>
  )
}
