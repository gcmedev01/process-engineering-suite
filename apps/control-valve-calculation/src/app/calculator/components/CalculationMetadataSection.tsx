"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, FileText, History, Plus, Trash2 } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import type { CalculationMetadata, RevisionRecord } from "@/types"
import { SectionCard } from "./SectionCard"

interface Props {
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (revisionHistory: RevisionRecord[]) => void
}

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

const EMPTY_REVISION: RevisionRecord = {
  rev: "",
  by: "",
  byDate: "",
  checkedBy: "",
  checkedDate: "",
  approvedBy: "",
  approvedDate: "",
}

function normalizeRevisionHistory(rows: RevisionRecord[]): RevisionRecord[] {
  const trimmed = rows
    .map((row) => ({
      rev: row.rev.trim(),
      by: row.by.trim(),
      byDate: row.byDate ?? "",
      checkedBy: row.checkedBy.trim(),
      checkedDate: row.checkedDate ?? "",
      approvedBy: row.approvedBy.trim(),
      approvedDate: row.approvedDate ?? "",
    }))
    .filter(
      (row) =>
        row.rev.length > 0 ||
        row.by.length > 0 ||
        row.checkedBy.length > 0 ||
        row.approvedBy.length > 0
    )

  return trimmed.slice(0, 3)
}

export function CalculationMetadataSection({
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
}: Props) {
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false)
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [metadataDraft, setMetadataDraft] = useState<CalculationMetadata>(metadata)
  const [revisionsDraft, setRevisionsDraft] = useState<RevisionRecord[]>(revisionHistory)

  const populatedCount = useMemo(() => {
    return Object.values(metadata).filter((value) => value.trim().length > 0).length
  }, [metadata])

  const handleMetadataOpen = (open: boolean) => {
    setMetadataDialogOpen(open)
    if (open) {
      setMetadataDraft(metadata)
    }
  }

  const handleRevisionsOpen = (open: boolean) => {
    setRevisionDialogOpen(open)
    if (open) {
      setRevisionsDraft(revisionHistory)
    }
  }

  const saveMetadata = () => {
    onMetadataChange({
      projectNumber: metadataDraft.projectNumber.trim(),
      documentNumber: metadataDraft.documentNumber.trim(),
      title: metadataDraft.title.trim(),
      projectName: metadataDraft.projectName.trim(),
      client: metadataDraft.client.trim(),
    })
    setMetadataDialogOpen(false)
  }

  const saveRevisions = () => {
    onRevisionHistoryChange(normalizeRevisionHistory(revisionsDraft))
    setRevisionDialogOpen(false)
  }

  const addRevisionRow = () => {
    if (revisionsDraft.length >= 3) {
      return
    }
    setRevisionsDraft((prev) => [...prev, { ...EMPTY_REVISION }])
  }

  const moveRevisionRow = (index: number, direction: "up" | "down") => {
    setRevisionsDraft((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev
      }
      const next = [...prev]
      const [row] = next.splice(index, 1)
      next.splice(targetIndex, 0, row)
      return next
    })
  }

  const updateRevision = <K extends keyof RevisionRecord>(
    index: number,
    key: K,
    value: RevisionRecord[K],
  ) => {
    setRevisionsDraft((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    )
  }

  return (
    <SectionCard
      title="Calculation Metadata"
      action={
        <div className="flex items-center gap-2">
          <Dialog open={revisionDialogOpen} onOpenChange={handleRevisionsOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                Edit Revisions
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Edit Revision History</DialogTitle>
                <DialogDescription>
                  Keep maximum 3 latest revisions with Rev, By/Date, Checked/Date, Approved/Date.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                {revisionsDraft.length === 0 ? (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    No revision records yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revisionsDraft.map((row, index) => (
                      <div key={`rev-row-${index}`} className="rounded-md border p-3">
                        <div className="grid gap-3 lg:grid-cols-[96px_minmax(0,1fr)_132px]">
                          <div className="space-y-1.5">
                            <Label htmlFor={`revision-rev-${index}`}>Rev</Label>
                            <Input
                              id={`revision-rev-${index}`}
                              value={row.rev}
                              placeholder="O1"
                              onChange={(event) => updateRevision(index, "rev", event.target.value)}
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            {([
                              ["By", "by", "byDate", "Originator"],
                              ["Checked", "checkedBy", "checkedDate", "Checker"],
                              ["Approved", "approvedBy", "approvedDate", "Approver"],
                            ] as const).map(([label, nameKey, dateKey, placeholder]) => (
                              <div key={`${label}-${index}`} className="space-y-2 rounded-md border p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {label}
                                </p>
                                <Input
                                  value={row[nameKey]}
                                  placeholder={placeholder}
                                  onChange={(event) => updateRevision(index, nameKey, event.target.value)}
                                />
                                <Input
                                  type="date"
                                  value={row[dateKey] ?? ""}
                                  onChange={(event) => updateRevision(index, dateKey, event.target.value)}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex items-start justify-end gap-1 lg:pt-6">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveRevisionRow(index, "up")}
                              disabled={index === 0}
                              aria-label="Move revision up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveRevisionRow(index, "down")}
                              disabled={index === revisionsDraft.length - 1}
                              aria-label="Move revision down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setRevisionsDraft((prev) => prev.filter((_, i) => i !== index))
                              }
                              aria-label="Delete revision"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={addRevisionRow}
                  disabled={revisionsDraft.length >= 3}
                >
                  <Plus className="h-4 w-4" />
                  Add Revision
                </Button>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRevisionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={saveRevisions}>
                  Save Revisions
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={metadataDialogOpen} onOpenChange={handleMetadataOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Edit Metadata
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Calculation Metadata</DialogTitle>
                <DialogDescription>
                  These fields will be used later for exported report headers.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="meta-project-number">Project Number</Label>
                  <Input
                    id="meta-project-number"
                    value={metadataDraft.projectNumber}
                    onChange={(event) =>
                      setMetadataDraft((prev) => ({ ...prev, projectNumber: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="meta-document-number">Document Number</Label>
                  <Input
                    id="meta-document-number"
                    value={metadataDraft.documentNumber}
                    onChange={(event) =>
                      setMetadataDraft((prev) => ({ ...prev, documentNumber: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="meta-title">Title</Label>
                  <Input
                    id="meta-title"
                    value={metadataDraft.title}
                    onChange={(event) =>
                      setMetadataDraft((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="meta-project-name">Project Name</Label>
                  <Input
                    id="meta-project-name"
                    value={metadataDraft.projectName}
                    onChange={(event) =>
                      setMetadataDraft((prev) => ({ ...prev, projectName: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="meta-client">Client</Label>
                  <Input
                    id="meta-client"
                    value={metadataDraft.client}
                    onChange={(event) =>
                      setMetadataDraft((prev) => ({ ...prev, client: event.target.value }))
                    }
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={() => setMetadataDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveMetadata}>
                  Save Metadata
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <p className="text-muted-foreground">
          Project Number: <span className="text-foreground">{metadata.projectNumber || "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Document Number: <span className="text-foreground">{metadata.documentNumber || "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Title: <span className="text-foreground">{metadata.title || "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Project Name: <span className="text-foreground">{metadata.projectName || "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Client: <span className="text-foreground">{metadata.client || "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Revision Records: <span className="text-foreground">{revisionHistory.length}</span>
        </p>
      </div>

      <div className="mt-2 overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Rev.</th>
              <th className="p-2">By</th>
              <th className="p-2">Date</th>
              <th className="p-2">Checked</th>
              <th className="p-2">Date</th>
              <th className="p-2">Approved</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {revisionHistory.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  No revision records.
                </td>
              </tr>
            ) : (
              revisionHistory.map((row, index) => (
                <tr key={`display-rev-${index}`} className="border-b last:border-b-0">
                  <td className="p-2">{row.rev || "—"}</td>
                  <td className="p-2">{row.by || "—"}</td>
                  <td className="p-2">{row.byDate || "—"}</td>
                  <td className="p-2">{row.checkedBy || "—"}</td>
                  <td className="p-2">{row.checkedDate || "—"}</td>
                  <td className="p-2">{row.approvedBy || "—"}</td>
                  <td className="p-2">{row.approvedDate || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Metadata completeness: {populatedCount}/5 fields
      </p>
    </SectionCard>
  )
}
