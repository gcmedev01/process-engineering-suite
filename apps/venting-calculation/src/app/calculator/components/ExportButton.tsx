"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"

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

/**
 * ExportButton — generates a PDF from the current calculation result and
 * triggers a browser download.  Disabled when there is no valid result.
 *
 * Uses a dynamic import of @react-pdf/renderer to avoid SSR issues.
 */
export function ExportButton({
  calculationResult,
  calculationMetadata,
  revisionHistory,
}: {
  calculationResult: import("@/types").CalculationResult | null
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
}) {
  const { getValues } = useFormContext<CalculationInput>()
  const [generating, setGenerating] = useState(false)

  const handleExport = async () => {
    if (!calculationResult) return

    setGenerating(true)
    try {
      // Dynamic import keeps the heavy PDF library out of the initial bundle
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
        />
      ).toBlob()

      // Trigger download
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
      setGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!calculationResult || generating}
      onClick={handleExport}
      className="gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export PDF
        </>
      )}
    </Button>
  )
}
