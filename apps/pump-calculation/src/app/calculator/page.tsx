"use client"

import { useMemo, useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthInteractionGuard } from "@eng-suite/ui-kit"
import type { Resolver } from "react-hook-form"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { computePumpResult } from "@/lib/calculations"
import { PumpType, EquipmentType } from "@/types"
import type {
  CalculationInput,
  CalculationMetadata,
  RevisionRecord,
  PumpCalculationResult,
} from "@/types"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ActionMenu } from "./components/ActionMenu"
import { CalculatorToolbar } from "./components/CalculatorToolbar"

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

const createDefaultValues = (): Partial<CalculationInput> => ({
  tag: "",
  description: "",
  pumpType: PumpType.CENTRIFUGAL,
  wearMarginPct: 5,
  efficiency: 75,
  calculateAccelHead: false,
  showOrifice: false,
  showControlValve: false,
  showMinFlow: false,
  showShutoff: false,
  isExistingSystem: false,
  suctionSourceType: EquipmentType.VESSEL,
  dischargeDestType: EquipmentType.VESSEL,
  suctionLineLoss: 0,
  suctionStrainerLoss: 0,
  suctionOtherLoss: 0,
  dischargeEquipmentDp: 0,
  dischargeLineLoss: 0,
  dischargeFlowElementDp: 0,
  dischargeDesignMargin: 0,
  metadata: EMPTY_METADATA,
})

export default function PumpCalculatorPage() {
  const form = useForm<CalculationInput>({
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: createDefaultValues() as any,
    mode: "onChange",
  })

  const [metadata, setMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])
  const [linkedEquipmentId, setLinkedEquipmentId] = useState<string | null>(null)
  const [linkedEquipmentTag, setLinkedEquipmentTag] = useState<string | null>(null)

  const watchedValues = form.watch()

  const { calculationResult, validationIssues } = useMemo<{
    calculationResult: PumpCalculationResult | null
    validationIssues: Array<{ path: string; message: string }> | null
  }>(() => {
    try {
      const parsed = calculationInputSchema.safeParse(watchedValues)
      if (parsed.success) {
        return { calculationResult: computePumpResult(parsed.data as CalculationInput), validationIssues: null }
      }
      // Only show validation issues once the user has filled the basic required fields.
      // Before that, show the RequirementsChecklist (validationIssues = null).
      const v = watchedValues
      const hasBasicInputs =
        typeof v.tag === 'string' && v.tag.trim().length > 0 &&
        typeof v.flowDesign === 'number' && isFinite(v.flowDesign) && v.flowDesign > 0 &&
        typeof v.sg === 'number' && isFinite(v.sg) && v.sg > 0
      if (!hasBasicInputs) {
        return { calculationResult: null, validationIssues: null }
      }
      return {
        calculationResult: null,
        validationIssues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      }
    } catch {
      return { calculationResult: null, validationIssues: null }
    }
  }, [watchedValues])

  const handleClear = () => {
    form.reset(createDefaultValues() as any, { keepDefaultValues: false })
    form.clearErrors()
    setMetadata(EMPTY_METADATA)
    setRevisionHistory([])
    setLinkedEquipmentId(null)
    setLinkedEquipmentTag(null)
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        <CalculatorToolbar
          actions={(
            <ActionMenu
              onClear={handleClear}
              calculationMetadata={metadata}
              revisionHistory={revisionHistory}
              onCalculationLoaded={(m, r, equipId, equipTag) => {
                setMetadata(m)
                setRevisionHistory(r)
                setLinkedEquipmentId(equipId ?? null)
                setLinkedEquipmentTag(equipTag ?? null)
              }}
              calculationResult={calculationResult}
              linkedEquipmentId={linkedEquipmentId}
              linkedEquipmentTag={linkedEquipmentTag}
              onEquipmentLinked={(id, tag) => {
                setLinkedEquipmentId(id)
                setLinkedEquipmentTag(tag ?? null)
              }}
            />
          )}
        />

        <AuthInteractionGuard notice>
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <InputPanel
                metadata={metadata}
                onMetadataChange={setMetadata}
                revisionHistory={revisionHistory}
                onRevisionHistoryChange={setRevisionHistory}
                result={calculationResult}
              />
              <ResultsPanel result={calculationResult} validationIssues={validationIssues} />
            </div>
          </div>
        </AuthInteractionGuard>
      </main>
    </FormProvider>
  )
}
