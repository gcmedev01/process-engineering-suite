"use client"

import { useEffect, useState } from "react"
import { useFormContext } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useSavedCalculations,
  type SavedCalculationItem,
} from "@/lib/hooks/useSavedCalculations"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"

interface Props {
  controlledOpen: boolean
  onControlledOpenChange: (open: boolean) => void
  onCalculationLoaded: (metadata: CalculationMetadata, revisionHistory: RevisionRecord[]) => void
}

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

/** Load a saved calculation from the shared `/calculations` API. */
export function LoadCalculationButton({
  controlledOpen,
  onControlledOpenChange,
  onCalculationLoaded,
}: Props) {
  const { reset } = useFormContext<CalculationInput>()
  const { fetchList, savedItems, isLoading, error } = useSavedCalculations()
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (controlledOpen) {
      void fetchList()
    }
  }, [controlledOpen, fetchList])

  const handleSelect = (item: SavedCalculationItem) => {
    setLoadError(null)
    try {
      reset(item.inputs as unknown as CalculationInput, { keepDefaultValues: false })
      onCalculationLoaded(item.calculationMetadata ?? EMPTY_METADATA, item.revisionHistory ?? [])
      onControlledOpenChange(false)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load calculation")
    }
  }

  return (
    <Dialog open={controlledOpen} onOpenChange={onControlledOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Load calculation</DialogTitle>
          <DialogDescription>Select a saved control-valve calculation to restore.</DialogDescription>
        </DialogHeader>
        {(error || loadError) && <p className="text-xs text-destructive">{error ?? loadError}</p>}
        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : savedItems.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No saved calculations found.</p>
          ) : (
            <ul className="divide-y">
              {savedItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.tag}
                      {item.updatedAt ? ` · ${new Date(item.updatedAt).toLocaleString()}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
