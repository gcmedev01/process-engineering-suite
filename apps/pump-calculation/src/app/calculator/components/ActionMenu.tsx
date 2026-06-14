'use client'

import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  Menu,
  Database,
  HardDriveDownload,
  Save,
  FolderOpen,
  RotateCcw,
  FileDown,
  Loader2,
  LinkIcon,
  Upload,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buildCalculationFileEnvelope, downloadCalculationFile, readCalculationFile } from '@/lib/calculationFile'
import { SaveCalculationButton } from './SaveCalculationButton'
import { LoadCalculationButton } from './LoadCalculationButton'
import { EquipmentLinkButton } from './EquipmentLinkButton'
import { apiClient } from '@/lib/apiClient'
import type { CalculationInput, CalculationMetadata, RevisionRecord, PumpCalculationResult } from '@/types'

interface Props {
  onClear: () => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[], equipmentId?: string | null, equipmentTag?: string | null) => void
  calculationResult: PumpCalculationResult | null
  linkedEquipmentId: string | null
  linkedEquipmentTag: string | null
  onEquipmentLinked: (id: string | null, tag?: string | null) => void
}

function latestRevisionValue(revisions: RevisionRecord[]): string | null {
  const dated = revisions
    .map((item) => {
      const rev = item.rev?.trim()
      const rawDate = item.byDate?.trim() || item.checkedDate?.trim() || item.approvedDate?.trim() || ''
      const dateValue = rawDate ? Date.parse(rawDate) : Number.NaN
      return { rev, dateValue }
    })
    .filter((item) => item.rev && Number.isFinite(item.dateValue))
    .sort((a, b) => b.dateValue - a.dateValue)

  if (dated.length > 0) return dated[0].rev ?? null

  return revisions.find((item) => item.rev?.trim())?.rev?.trim() ?? null
}

export function ActionMenu({
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
  calculationResult,
  linkedEquipmentId,
  linkedEquipmentTag,
  onEquipmentLinked,
}: Props) {
  const { getValues, reset } = useFormContext<CalculationInput>()

  const [saveOpen, setSaveOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExportPdf = async () => {
    if (!calculationResult) return
    setPdfLoading(true)
    try {
      const [{ pdf }, { PumpReport }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/app/calculator/pdf/PumpReport'),
      ])
      const input = getValues()
      const blob = await pdf(
        <PumpReport
          input={input}
          result={calculationResult}
          metadata={calculationMetadata}
          revisions={revisionHistory}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const doc = (calculationMetadata.documentNumber || input.tag || 'pump-calc')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
      const latestRev = latestRevisionValue(revisionHistory)
      const revSuffix = latestRev ? `_Rev.${latestRev.replace(/[^a-zA-Z0-9-_]/g, '_')}` : ''
      a.download = `${doc}${revSuffix}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSaveToFile = () => {
    const input = getValues()
    const fileBase = (calculationMetadata.documentNumber?.trim() || input.tag?.trim() || 'report')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
    const latestRev = latestRevisionValue(revisionHistory)
    const revSuffix = latestRev ? `_Rev.${latestRev.replace(/[^a-zA-Z0-9-_]/g, '_')}` : ''
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
    event.target.value = ''
    if (!file) return
    try {
      const payload = await readCalculationFile(file)
      reset(payload.inputs as unknown as CalculationInput, { keepDefaultValues: false })
      onCalculationLoaded(payload.metadata, payload.revisionHistory)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not load file.')
    }
  }

  const resolveLinkedTag = async (): Promise<string | null> => {
    if (linkedEquipmentTag) return linkedEquipmentTag
    if (!linkedEquipmentId) return null
    const pumps = await apiClient.engineeringObjects.list({ objectType: 'PUMP', includeInactive: true })
    return pumps.find((obj) => obj.id === linkedEquipmentId)?.tag ?? null
  }

  const handleUpdateEquipment = async () => {
    if (!linkedEquipmentId) return
    setUpdateError(null)
    setUpdated(false)
    setIsUpdating(true)
    try {
      const resolvedTag = await resolveLinkedTag()
      if (!resolvedTag) throw new Error('Linked PUMP object tag could not be resolved')

      const current = await apiClient.engineeringObjects.get(resolvedTag)
      const currentProperties = (current.properties ?? {}) as Record<string, unknown>
      const existingDetails = (currentProperties.details ?? {}) as Record<string, unknown>
      const values = getValues()

      const kpaToBarg = (kpa: number | null | undefined): number | null =>
        kpa != null ? Math.round((kpa / 100 - 1.01325) * 1000) / 1000 : null

      const details: Record<string, unknown> = {
        ...existingDetails,
        pumpType: values.pumpType,
        ratedFlowM3h: values.flowDesign ?? null,
        ratedHeadM: calculationResult?.differentialHead ?? null,
        maxDischargePressureBarg: kpaToBarg(calculationResult?.dischargePressureKpa),
        shutoffHeadM: calculationResult?.shutoffHead ?? null,
        npshRequiredM: null,
        efficiencyPct: values.efficiency ?? null,
        motorPowerKw: calculationResult?.recommendedMotorKw ?? null,
        maxViscosityCp: values.viscosity ?? null,
        suctionPressureBarg: kpaToBarg(calculationResult?.suctionPressureKpa),
        dischargePressureBarg: kpaToBarg(calculationResult?.dischargePressureKpa),
        fluidTemperatureC: values.temperature ?? null,
        fluidDensityKgm3: values.sg != null ? values.sg * 1000 : null,
        npsha: calculationResult?.npsha ?? null,
        sg: values.sg ?? null,
        pumpCalculation: {
          inputs: values,
          result: calculationResult ?? null,
          calculationMetadata,
          revisionHistory,
          syncedAt: new Date().toISOString(),
        },
      }

      await apiClient.engineeringObjects.upsert(resolvedTag, {
        object_type: 'PUMP',
        status: current.status ?? undefined,
        properties: { ...currentProperties, details },
      })

      setUpdated(true)
      setTimeout(() => setUpdated(false), 1600)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update equipment')
      setTimeout(() => setUpdateError(null), 4000)
    } finally {
      setIsUpdating(false)
    }
  }

  const updateLabel = useMemo(() => {
    if (isUpdating) return 'Updating...'
    if (updated) return 'Updated'
    return 'Update Equipment'
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
          <Button variant="outline" size="sm" className="gap-2">
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
          <DropdownMenuItem
            onClick={handleExportPdf}
            disabled={!calculationResult || pdfLoading}
            className="gap-2"
          >
            {pdfLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />
            }
            {pdfLoading ? 'Generating PDF…' : 'Export PDF…'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setLinkOpen(true)} className="gap-2">
            <LinkIcon className={`h-4 w-4 ${linkedEquipmentId ? 'text-green-600' : ''}`} />
            {linkedEquipmentTag
              ? `Linked: ${linkedEquipmentTag}`
              : linkedEquipmentId
                ? `Linked: ${linkedEquipmentId}`
                : 'Link equipment…'}
          </DropdownMenuItem>
          {linkedEquipmentId && (
            <DropdownMenuItem
              onClick={() => { void handleUpdateEquipment() }}
              className="gap-2"
              disabled={isUpdating}
            >
              <UpdateIcon className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
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

      <SaveCalculationButton
        controlledOpen={saveOpen}
        onControlledOpenChange={setSaveOpen}
        equipmentId={linkedEquipmentId}
        equipmentTag={linkedEquipmentTag}
        calculationMetadata={calculationMetadata}
        revisionHistory={revisionHistory}
        calculationResult={calculationResult}
      />
      <LoadCalculationButton
        controlledOpen={loadOpen}
        onControlledOpenChange={setLoadOpen}
        onCalculationLoaded={onCalculationLoaded}
      />
      <EquipmentLinkButton
        controlledOpen={linkOpen}
        onControlledOpenChange={setLinkOpen}
        linkedEquipmentId={linkedEquipmentId}
        linkedEquipmentTag={linkedEquipmentTag}
        onEquipmentLinked={onEquipmentLinked}
      />
    </>
  )
}
