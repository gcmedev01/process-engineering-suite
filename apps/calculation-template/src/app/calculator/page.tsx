"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { useCalculation } from "@/lib/hooks/useCalculation"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"
import type { Resolver } from "react-hook-form"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ActionMenu } from "./components/ActionMenu"
import { CalculatorToolbar } from "./components/CalculatorToolbar"

const createDefaultValues = (): Partial<CalculationInput> => ({
  tag: "",
  description: "",
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
    defaultValues: createDefaultValues() as unknown as CalculationInput,
    mode: "onChange",
  })

  // Wire form → hook
  const { calculationResult, derivedGeometry, validationIssues } = useCalculation(form.control)

  const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])

  const handleClear = () => {
    form.reset(createDefaultValues() as unknown as CalculationInput, { keepDefaultValues: false })
    form.clearErrors()
    setCalculationMetadata(EMPTY_METADATA)
    setRevisionHistory([])
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        <CalculatorToolbar
          actions={(
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
          )}
        />

        {/* Two-column layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div>
              <InputPanel
                metadata={calculationMetadata}
                onMetadataChange={setCalculationMetadata}
                revisionHistory={revisionHistory}
                onRevisionHistoryChange={setRevisionHistory}
                derivedGeometry={derivedGeometry}
              />
            </div>

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
