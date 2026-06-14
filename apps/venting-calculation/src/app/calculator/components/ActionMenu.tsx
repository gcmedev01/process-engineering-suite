"use client"

import { type ChangeEvent, useMemo, useRef, useState } from "react"
import { useFormContext } from "react-hook-form"
import {
  Menu,
  Database,
  HardDriveDownload,
  Save,
  FolderOpen,
  Link2,
  FileDown,
  Upload,
  RotateCcw,
  Loader2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildCalculationFileEnvelope, downloadCalculationFile, readCalculationFile } from "@/lib/calculationFile"
import { apiClient } from "@/lib/apiClient"
import { convertUnit } from "@eng-suite/physics"
import { TankConfiguration, type CalculationInput, type CalculationMetadata, type RevisionRecord, type CalculationResult, type DerivedGeometry } from "@/types"
import { LinkTankButton } from "./LinkTankButton"
import { LoadCalculationButton } from "./LoadCalculationButton"
import { SaveCalculationButton } from "./SaveCalculationButton"

interface ActionMenuProps {
  onTankLinked: (equipmentId: string | null, tankTag?: string | null) => void
  linkedTag: string | null
  linkedEquipmentId: string | null
  clearToken: number
  onClear: () => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  onCalculationLoaded: (metadata: CalculationMetadata, revisionHistory: RevisionRecord[]) => void
  calculationResult: CalculationResult | null
  derivedGeometry: DerivedGeometry | null
}

function latestRevisionValue(revisions: RevisionRecord[]): string | null {
  const dated = revisions
    .map((item) => {
      const rev = item.rev?.trim()
      const rawDate = item.byDate?.trim() || item.checkedDate?.trim() || item.approvedDate?.trim() || ""
      const dateValue = rawDate ? Date.parse(rawDate) : Number.NaN
      return { rev, dateValue }
    })
    .filter((item) => item.rev && Number.isFinite(item.dateValue))
    .sort((a, b) => b.dateValue - a.dateValue)

  if (dated.length > 0) return dated[0].rev ?? null

  return revisions.find((item) => item.rev?.trim())?.rev?.trim() ?? null
}

function fromKPag(value: number, unit: string | null | undefined): number | null {
  const targetUnit = unit ?? "barg"
  const converted = convertUnit(value, "kPag", targetUnit)
  return Number.isFinite(converted) ? converted : null
}

export function ActionMenu({
  onTankLinked,
  linkedTag,
  linkedEquipmentId,
  clearToken,
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
  calculationResult,
  derivedGeometry,
}: ActionMenuProps) {
  const { getValues, reset } = useFormContext<CalculationInput>()

  const [linkOpen, setLinkOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canExport = !!calculationResult && !isExporting
  const canUpdate = !!linkedEquipmentId && !isUpdating

  const handleExport = async () => {
    if (!calculationResult) return
    setIsExporting(true)
    try {
      const [{ pdf }, { CalculationReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/CalculationReport"),
      ])
      const input = getValues()
      const blob = await pdf(
        <CalculationReport
          input={input}
          result={calculationResult}
          metadata={calculationMetadata}
          revisions={revisionHistory}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const fileBase = (calculationMetadata.documentNumber || input.tankNumber || "venting-calc")
        .replace(/[^a-zA-Z0-9-_]/g, "_")
      const latestRev = latestRevisionValue(revisionHistory)
      const revSuffix = latestRev ? `_Rev.${latestRev.replace(/[^a-zA-Z0-9-_]/g, "_")}` : ""
      a.download = `${fileBase}${revSuffix}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF generation failed:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveToFile = () => {
    const input = getValues()
    const fileBase = (calculationMetadata.documentNumber || input.tankNumber || "venting-calc")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
    const latestRev = latestRevisionValue(revisionHistory)
    const revSuffix = latestRev ? `_Rev.${latestRev.replace(/[^a-zA-Z0-9-_]/g, "_")}` : ""
    const envelope = buildCalculationFileEnvelope({
      name: fileBase,
      inputs: input as unknown as Record<string, unknown>,
      metadata: calculationMetadata,
      revisionHistory,
    })
    downloadCalculationFile(envelope, `${fileBase}${revSuffix}`)
  }

  const handleFilePick = () => {
    setFileError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const payload = await readCalculationFile(file)
      reset(payload.inputs as unknown as CalculationInput, { keepDefaultValues: false })
      onCalculationLoaded(payload.metadata, payload.revisionHistory)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not load file.")
    }
  }

  const resolveLinkedTankTag = async (): Promise<string | null> => {
    if (linkedTag) return linkedTag
    if (!linkedEquipmentId) return null
    const tanks = await apiClient.engineeringObjects.list({ objectType: 'TANK', includeInactive: true })
    const found = tanks.find((item) => (item as { id?: string | null }).id === linkedEquipmentId)
    return found?.tag ?? null
  }

  const handleUpdateEquipment = async () => {
    if (!linkedEquipmentId) return
    setUpdateError(null)
    setUpdated(false)
    setIsUpdating(true)
    try {
      const resolvedTag = await resolveLinkedTankTag()
      if (!resolvedTag) throw new Error('Linked engineering object tag could not be resolved')

      const current = await apiClient.engineeringObjects.get(resolvedTag)
      if (current.object_type !== 'TANK') throw new Error('Linked object is not a tank')

      const values = getValues()
      const currentProperties = (current.properties ?? {}) as Record<string, unknown>
      const designParameters =
        (currentProperties.design_parameters as Record<string, unknown> | undefined) ?? {}
      const existingDetails = (currentProperties.details ?? {}) as Record<string, unknown>
      const insulated =
        values.tankConfiguration === TankConfiguration.INSULATED_FULL ||
        values.tankConfiguration === TankConfiguration.INSULATED_PARTIAL

      const details: Record<string, unknown> = {
        ...existingDetails,
        innerDiameter: values.diameter,
        height: values.height,
        insulated,
        insulationThickness: insulated ? values.insulationThickness : null,
        insulationConductivity: insulated ? values.insulationConductivity : null,
        insideHeatTransferCoeff: insulated ? values.insideHeatTransferCoeff : null,
        insulatedSurfaceArea:
          values.tankConfiguration === TankConfiguration.INSULATED_PARTIAL
            ? values.insulatedSurfaceArea
            : null,
        latitude: values.latitude,
        workingTemperature: values.avgStorageTemp,
        workingTemperatureUnit: 'C',
        fluid:
          (typeof existingDetails.fluid === 'string' ? existingDetails.fluid : null) ??
          calculationResult?.emergencyVenting.referenceFluid ??
          null,
        vapourPressure: values.vapourPressure,
        vapourPressureUnit: 'kPa',
        flashPoint: values.flashBoilingPointType === 'FP' ? values.flashBoilingPoint ?? null : null,
        flashPointUnit: 'C',
        boilingPoint: values.flashBoilingPointType === 'BP' ? values.flashBoilingPoint ?? null : null,
        boilingPointUnit: 'C',
        latentHeat: values.latentHeat ?? null,
        latentHeatUnit: 'kJ/kg',
        relievingTemperature: values.relievingTemperature ?? null,
        relievingTemperatureUnit: 'C',
        molecularWeight: values.molecularMass ?? null,
        tankConfiguration: values.tankConfiguration,
        volume: derivedGeometry?.maxTankVolume ?? calculationResult?.derived.maxTankVolume ?? null,
        wettedArea: derivedGeometry?.wettedArea ?? calculationResult?.derived.wettedArea ?? null,
        ventingCalculation: {
          inputs: values,
          result: calculationResult ?? null,
          syncedAt: new Date().toISOString(),
        },
      }

      const targetPressureUnit =
        typeof designParameters.designPressureUnit === 'string'
          ? designParameters.designPressureUnit
          : 'barg'
      const convertedDesignPressure = fromKPag(values.designPressure, targetPressureUnit)
      if (convertedDesignPressure === null) {
        throw new Error(`Unsupported pressure unit for update: ${targetPressureUnit}`)
      }

      await apiClient.engineeringObjects.upsert(resolvedTag, {
        object_type: current.object_type,
        status: current.status ?? undefined,
        properties: {
          ...currentProperties,
          design_parameters: {
            ...designParameters,
            designPressure: convertedDesignPressure,
            designPressureUnit: targetPressureUnit,
          },
          details,
        },
      })

      setUpdated(true)
      setTimeout(() => setUpdated(false), 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update equipment'
      setUpdateError(msg)
      setTimeout(() => setUpdateError(null), 4000)
    } finally {
      setIsUpdating(false)
    }
  }

  const updateLabel = useMemo(() => {
    if (isUpdating) return "Updating..."
    if (updated) return "Updated"
    return "Update Equipment"
  }, [isUpdating, updated])

  const UpdateIcon = isUpdating ? Loader2 : updated ? Check : Upload

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => { void handleFileChange(event) }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Menu className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSaveOpen(true)} className="gap-2">
            <Database className="h-4 w-4" />
            Save calculation…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLoadOpen(true)} className="gap-2">
            <HardDriveDownload className="h-4 w-4" />
            Load calculation…
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleSaveToFile} className="gap-2">
            <Save className="h-4 w-4" />
            Save to File…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleFilePick} className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Load from File…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport} disabled={!canExport} className="gap-2">
            {isExporting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />
            }
            {isExporting ? "Generating PDF…" : "Export PDF…"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setLinkOpen(true)} className="gap-2">
            <Link2 className={`h-4 w-4 ${linkedEquipmentId ? "text-green-600" : ""}`} />
            {linkedTag ? `Linked: ${linkedTag}` : "Link Tank…"}
          </DropdownMenuItem>
          {linkedEquipmentId && (
            <DropdownMenuItem
              onClick={() => { void handleUpdateEquipment() }}
              className="gap-2"
              disabled={!canUpdate}
            >
              <UpdateIcon className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
              {updateLabel}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onClear} className="text-destructive focus:text-destructive">
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear all inputs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {fileError && <p className="text-xs text-destructive">{fileError}</p>}
      {updateError && <p className="text-xs text-destructive">{updateError}</p>}

      <LinkTankButton
        onTankLinked={onTankLinked}
        linkedTag={linkedTag}
        clearToken={clearToken}
        controlledOpen={linkOpen}
        onControlledOpenChange={setLinkOpen}
      />
      <LoadCalculationButton
        onTankLinked={onTankLinked}
        onCalculationLoaded={onCalculationLoaded}
        controlledOpen={loadOpen}
        onControlledOpenChange={setLoadOpen}
      />
      <SaveCalculationButton
        equipmentId={linkedEquipmentId}
        calculationMetadata={calculationMetadata}
        revisionHistory={revisionHistory}
        controlledOpen={saveOpen}
        onControlledOpenChange={setSaveOpen}
        calculationResult={calculationResult}
      />
    </>
  )
}
