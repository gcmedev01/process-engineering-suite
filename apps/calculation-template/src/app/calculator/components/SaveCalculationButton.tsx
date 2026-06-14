"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSavedCalculations } from "@/lib/hooks/useSavedCalculations"
import type { CalculationInput, CalculationMetadata, CalculationResult, RevisionRecord } from "@/types"

interface Props {
  controlledOpen: boolean
  onControlledOpenChange: (open: boolean) => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  calculationResult: CalculationResult | null
}

/** Save the current calculation to the shared `/calculations` API. */
export function SaveCalculationButton({
  controlledOpen,
  onControlledOpenChange,
  calculationMetadata,
  revisionHistory,
  calculationResult,
}: Props) {
  const { getValues } = useFormContext<CalculationInput>()
  const { save, isSaving } = useSavedCalculations()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setError(null)
    const input = getValues()
    const finalName = name.trim() || calculationMetadata.documentNumber.trim() || input.tag.trim() || "Untitled"
    try {
      await save({
        name: finalName,
        description: input.description ?? "",
        tag: input.tag || undefined,
        inputs: input as unknown as Record<string, unknown>,
        results: (calculationResult as unknown as Record<string, unknown>) ?? null,
        calculationMetadata,
        revisionHistory,
      })
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onControlledOpenChange(false)
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }

  return (
    <Dialog open={controlledOpen} onOpenChange={onControlledOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save calculation</DialogTitle>
          <DialogDescription>Stores the current inputs and results to the database.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="save-name">Name</Label>
          <Input
            id="save-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. calculation name"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onControlledOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saved ? "Saved" : isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
