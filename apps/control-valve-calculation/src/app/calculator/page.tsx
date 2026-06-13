"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { Resolver } from "react-hook-form"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { useCalculation } from "@/lib/hooks/useCalculation"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ActionMenu } from "./components/ActionMenu"

const createDefaultValues = (): CalculationInput => ({
  tag: "",
  description: "",
  metadata: { projectNumber: "", documentNumber: "", title: "", projectName: "", client: "" },
  valve: {
    unitSystem: "metric_kpa",
    valveType: "globe",
    flowCharacteristic: "equal_percentage",
    valveSize: 50,
    lineSizeUpstream: 50,
    lineSizeDownstream: 50,
    fittings: "none",
    FL: 0.9,
    xT: 0.72,
    Fd: 0.46,
    flowBasis: "Cv",
  },
  fluid: {
    fluidType: "liquid",
    Gf: 1.0,
    Pv: 2.34,
    Pc: 22064,
  },
  cases: [
    {
      caseName: "normal",
      flowMode: "volumetric_actual",
      flowRate: 25,
      P1: 500,
      P1Basis: "absolute",
      P2: 400,
      P2Basis: "absolute",
      T1: 20,
    },
  ],
})

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

export default function CalculatorPage() {
  const form = useForm<CalculationInput>({
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: createDefaultValues(),
    mode: "onChange",
  })

  const { calculationResult, validationIssues } = useCalculation(form.control)

  const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])

  const handleClear = () => {
    form.reset(createDefaultValues(), { keepDefaultValues: false })
    form.clearErrors()
    setCalculationMetadata(EMPTY_METADATA)
    setRevisionHistory([])
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        {/* Secondary action bar */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                ISA-75.01.01 / IEC 60534-2-1 · liquid &amp; gas/vapor
              </p>
              <ActionMenu
                onClear={handleClear}
                calculationMetadata={calculationMetadata}
                revisionHistory={revisionHistory}
                onCalculationLoaded={(metadata, loadedRevisionHistory) => {
                  setCalculationMetadata(metadata)
                  setRevisionHistory(loadedRevisionHistory)
                }}
                calculationResult={calculationResult}
              />
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div>
              <InputPanel
                metadata={calculationMetadata}
                onMetadataChange={setCalculationMetadata}
                revisionHistory={revisionHistory}
                onRevisionHistoryChange={setRevisionHistory}
              />
            </div>
            <div className="space-y-4">
              <ResultsPanel
                calculationResult={calculationResult}
                validationIssues={validationIssues}
              />
              {/* Schematic hidden for now — not required for valve sizing. */}
            </div>
          </div>
        </div>
      </main>
    </FormProvider>
  )
}
