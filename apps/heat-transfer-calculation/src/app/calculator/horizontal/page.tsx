"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm, FormProvider, useWatch } from "react-hook-form"
import { AuthInteractionGuard } from "@eng-suite/ui-kit"
import type {
  CalculationMetadata,
  HeatTransferCalculationInput,
  HorizontalTankInput,
  HorizontalTankResult,
  RevisionRecord,
} from "@/types"
import { HeadType } from "@/types"
import { calculateHorizontalTank } from "@/lib/calculations/horizontal-tank"
import { HorizontalInputPanel } from "./HorizontalInputPanel"
import { HorizontalResultsPanel } from "./HorizontalResultsPanel"
import { ActionMenu } from "../components/ActionMenu"
import { CalculatorToolbar } from "../components/CalculatorToolbar"

const defaults: HorizontalTankInput = {
  tag: "", description: "",
  insideDiameter: 6000, tankLength: 10000, headType: HeadType.ELLIPSOIDAL_2_1,
  flangeWidth: 200, liquidLevel: 4000,
  fluidTemp: 100, ambientTemp: 40, windSpeed: 3, groundTemp: 50,
  wallThickness: 30, wallConductivity: 45.3, insulationThickness: 300, insulationConductivity: 0.035,
  fluidDensity: 971.8, fluidSpecificHeat: 4197, fluidViscosity: 0.000355, fluidThermalConductivity: 0.67, fluidExpansionCoeff: 0.000653,
  vaporDensity: 1.127, vaporSpecificHeat: 1007, vaporViscosity: 0.00001918, vaporThermalConductivity: 0.0266, vaporExpansionCoeff: 0.00321,
  foulingDryWall: 2500, foulingWetWall: 10000, foulingDryHead: 2500, foulingWetHead: 10000,
  surfaceEmissivity: 0.02, windEnhancement: 2, groundConductivity: 1.95,
  metadata: { projectNumber: "", documentNumber: "", title: "", projectName: "", client: "" },
}

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

export default function HorizontalCalculatorPage() {
  const form = useForm<HorizontalTankInput>({ defaultValues: defaults, mode: "onChange" })
  const [tag, setTag] = useState(defaults.tag)
  const [desc, setDesc] = useState(defaults.description ?? "")
  const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])
  const watched = useWatch({ control: form.control })

  useEffect(() => {
    form.setValue("tag", tag, { shouldValidate: true })
    form.setValue("description", desc)
  }, [desc, form, tag])

  const result = useMemo<HorizontalTankResult | null>(() => {
    if (!watched.insideDiameter || !watched.tankLength || watched.fluidTemp === undefined) return null
    try { return calculateHorizontalTank({ ...(watched as HorizontalTankInput), tag, description: desc }) }
    catch { return null }
  }, [watched, tag, desc])

  const handleClear = () => {
    form.reset(defaults, { keepDefaultValues: false })
    form.clearErrors()
    setTag(defaults.tag)
    setDesc(defaults.description ?? "")
    setCalculationMetadata(EMPTY_METADATA)
    setRevisionHistory([])
  }

  const handleInputsLoaded = (inputs: HeatTransferCalculationInput) => {
    setTag(inputs.tag)
    setDesc(inputs.description ?? "")
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
              onInputsLoaded={handleInputsLoaded}
              calculationResult={result}
              showEquipmentActions={false}
            />
          )}
        />
        <AuthInteractionGuard notice>
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <HorizontalInputPanel
                tag={tag}
                onTagChange={setTag}
                desc={desc}
                onDescChange={setDesc}
                metadata={calculationMetadata}
                onMetadataChange={setCalculationMetadata}
                revisionHistory={revisionHistory}
                onRevisionHistoryChange={setRevisionHistory}
              />
              <HorizontalResultsPanel result={result} />
            </div>
          </div>
        </AuthInteractionGuard>
      </main>
    </FormProvider>
  )
}
