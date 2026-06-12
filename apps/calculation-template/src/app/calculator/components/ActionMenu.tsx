"use client"

import { type ChangeEvent, useRef, useState } from "react"
import { useFormContext } from "react-hook-form"
import {
  Menu,
  FolderOpen,
  Save,
  RotateCcw,
  FileDown,
  Loader2,
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
import type { CalculationInput, CalculationMetadata, RevisionRecord, CalculationResult } from "@/types"

interface ActionMenuProps {
  onClear: () => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  onCalculationLoaded: (metadata: CalculationMetadata, revisionHistory: RevisionRecord[]) => void
  calculationResult: CalculationResult | null
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

export function ActionMenu({
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
  calculationResult,
}: ActionMenuProps) {
  const { getValues, reset } = useFormContext<CalculationInput>()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExportPdf = async () => {
    if (!calculationResult) return

    setPdfLoading(true)
    try {
      const [{ pdf }, { CalculationReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/CalculationReport"),
      ])

      const input = getValues()
      const blob = await pdf(
        <CalculationReport
          input={input}
          result={calculationResult}
          metadata={calculationMetadata}
          revisions={revisionHistory}
        />,
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const fileBase = (
        calculationMetadata.documentNumber?.trim() ||
        input.tag?.trim() ||
        "report"
      ).replace(/[^a-zA-Z0-9-_]/g, "_")
      const latestRev = latestRevisionValue(revisionHistory)
      const revSuffix = latestRev ? `_Rev.${latestRev.replace(/[^a-zA-Z0-9-_]/g, "_")}` : ""
      a.download = `${fileBase}${revSuffix}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSaveToFile = () => {
    const input = getValues()
    const fileBase = (
      calculationMetadata.documentNumber?.trim() ||
      input.tag?.trim() ||
      "report"
    ).replace(/[^a-zA-Z0-9-_]/g, "_")
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
          <DropdownMenuItem onClick={handleSaveToFile} className="gap-2">
            <Save className="h-4 w-4" />
            Save to File…
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleFilePick} className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Load from File…
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleExportPdf} disabled={!calculationResult || pdfLoading} className="gap-2">
            {pdfLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />
            }
            {pdfLoading ? "Generating PDF…" : "Export PDF…"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onClear} className="text-destructive focus:text-destructive">
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear all inputs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {fileError && <p className="text-xs text-destructive">{fileError}</p>}
    </>
  )
}
