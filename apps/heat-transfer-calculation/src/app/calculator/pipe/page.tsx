"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm, FormProvider, useWatch } from "react-hook-form"
import type {
  CalculationMetadata,
  HeatTransferCalculationInput,
  PipeCalculationInput,
  PipeCalculationResult,
  RevisionRecord,
} from "@/types"
import { PipeType, PipeOrientation } from "@/types"
import { calculatePipe } from "@/lib/calculations/pipe"
import { PipeInputPanel } from "./PipeInputPanel"
import { PipeResultsPanel } from "./PipeResultsPanel"
import { ActionMenu } from "../components/ActionMenu"
import { ModeHeader } from "../components/ModeHeader"

const defaultPipeValues: PipeCalculationInput = {
  tag: "",
  description: "",
  pipeType: PipeType.CIRCULAR,
  pipeOrientation: PipeOrientation.HORIZONTAL,
  pipeLength: 20,
  insideDiameter: 154.1,          // 6" SCH 40
  outsideDiameter: 168.3,         // 6"
  flowRate: 100,                  // kg/h
  inletTemp: 100,
  ambientTemp: 36,
  windSpeed: 3,
  fluidDensity: 971.8,            // water at ~80°C
  fluidSpecificHeat: 4197,
  fluidViscosity: 0.000355,
  fluidThermalConductivity: 0.67,
  wallThickness: 7.11,            // 6" SCH 40
  wallConductivity: 45.3,         // carbon steel
  insulationThickness: 20,        // 20mm mineral wool
  insulationConductivity: 0.035,
  surfaceEmissivity: 0.12,
  windEnhancement: 1.0,
  metadata: {
    projectNumber: "",
    documentNumber: "",
    title: "",
    projectName: "",
    client: "",
  },
}

export type PipeInput = PipeCalculationInput

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

export default function PipeCalculator() {
  const form = useForm<PipeCalculationInput>({
    defaultValues: defaultPipeValues,
    mode: "onChange",
  })

  const [tag, setTag] = useState(defaultPipeValues.tag)
  const [description, setDescription] = useState(defaultPipeValues.description ?? "")
  const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])

  const watchedValues = useWatch({ control: form.control })

  useEffect(() => {
    form.setValue("tag", tag, { shouldValidate: true })
    form.setValue("description", description)
  }, [description, form, tag])

  const result = useMemo<PipeCalculationResult | null>(() => {
    if (!watchedValues.pipeLength || !watchedValues.flowRate ||
        watchedValues.inletTemp === undefined || watchedValues.ambientTemp === undefined) {
      return null
    }
    try {
      const input: PipeCalculationInput = {
        ...(watchedValues as PipeCalculationInput),
        tag,
        description,
      }
      return calculatePipe(input)
    } catch {
      return null
    }
  }, [watchedValues, tag, description])

  const handleClear = () => {
    form.reset(defaultPipeValues, { keepDefaultValues: false })
    form.clearErrors()
    setTag(defaultPipeValues.tag)
    setDescription(defaultPipeValues.description ?? "")
    setCalculationMetadata(EMPTY_METADATA)
    setRevisionHistory([])
  }

  const handleInputsLoaded = (inputs: HeatTransferCalculationInput) => {
    setTag(inputs.tag)
    setDescription(inputs.description ?? "")
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        <ModeHeader
          activeMode="pipe"
          action={(
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
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div>
              <PipeInputPanel
                tag={tag}
                onTagChange={setTag}
                description={description}
                onDescriptionChange={setDescription}
              />
            </div>
            <div>
              <PipeResultsPanel result={result} />
            </div>
          </div>
        </div>
      </main>
    </FormProvider>
  )
}
