"use client"

import { useState, useMemo } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { Resolver } from "react-hook-form"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { computeVesselResult } from "@/lib/calculations"
import { DEFAULT_VESSEL_MATERIAL, defaultMaterialDensityKgM3 } from "@/lib/materials"
import { EquipmentMode, VesselOrientation, HeadType } from "@/types"
import type {
  CalculationInput,
  CalculationMetadata,
  RevisionRecord,
  CalculationResult,
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
  equipmentMode: EquipmentMode.VESSEL,
  orientation: VesselOrientation.VERTICAL,
  headType: HeadType.ELLIPSOIDAL_2_1,
  material: DEFAULT_VESSEL_MATERIAL,
  insideDiameter: undefined,
  shellLength: undefined,
  wallThickness: undefined,
  materialDensity: defaultMaterialDensityKgM3(DEFAULT_VESSEL_MATERIAL),
  headDepth: undefined,
  roofHeight: undefined,
  bootHeight: undefined,
  outletFittingDiameter: undefined,
  liquidLevel: undefined,
  hll: undefined,
  lll: undefined,
  ofl: undefined,
  density: undefined,
  flowrate: undefined,
  metadata: EMPTY_METADATA,
})

export default function VesselCalculatorPage() {
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

  const calculationResult = useMemo<CalculationResult | null>(() => {
    try {
      const parsed = calculationInputSchema.safeParse(watchedValues)
      if (!parsed.success) return null
      return computeVesselResult(parsed.data as CalculationInput)
    } catch {
      return null
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
              onCalculationLoaded={(m, r) => { setMetadata(m); setRevisionHistory(r) }}
              calculationResult={calculationResult}
              linkedEquipmentId={linkedEquipmentId}
              linkedEquipmentTag={linkedEquipmentTag}
              onEquipmentLinked={(equipmentId, equipmentTag) => {
                setLinkedEquipmentId(equipmentId)
                setLinkedEquipmentTag(equipmentTag ?? null)
              }}
            />
          )}
        />

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <InputPanel
              metadata={metadata}
              onMetadataChange={setMetadata}
              revisionHistory={revisionHistory}
              onRevisionHistoryChange={setRevisionHistory}
            />
            <ResultsPanel calculationResult={calculationResult} />
          </div>
        </div>
      </main>
    </FormProvider>
  )
}
