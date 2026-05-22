'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Save, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSavedCalculations } from '@/lib/hooks/useSavedCalculations';
import { buildCalculationFileEnvelope, downloadCalculationFile } from '@/lib/calculationFile';
import type {
  CalculationMetadata,
  RevisionRecord,
  HeatTransferCalculationInput,
  HeatTransferCalculationResult,
} from '@/types';

interface Props {
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
  equipmentId?: string | null;
  equipmentTag?: string | null;
  calculationMetadata: CalculationMetadata;
  revisionHistory: RevisionRecord[];
  calculationResult: HeatTransferCalculationResult | null;
}

export function SaveCalculationButton({
  controlledOpen,
  onControlledOpenChange,
  equipmentId,
  equipmentTag,
  calculationMetadata,
  revisionHistory,
  calculationResult,
}: Props) {
  const { getValues } = useFormContext<HeatTransferCalculationInput>();
  const { save, fetchList, isSaving, savedItems } = useSavedCalculations();

  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const open = controlledOpen ?? false;
  const setOpen = (v: boolean) => onControlledOpenChange?.(v);

  const reset = () => {
    setName('');
    setSaved(false);
    setError(null);
    setDuplicateId(null);
  };

  const handleSave = async (forceOverwrite = false) => {
    if (!name.trim()) return;
    setError(null);

    try {
      const current = savedItems.length > 0 ? savedItems : await fetchList({ includeInactive: false });
      const existing = current.find(
        (item) => item.isActive && item.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      if (existing && !forceOverwrite) {
        setDuplicateId(existing.id);
        return;
      }

      const inputs = getValues() as unknown as Record<string, unknown>;
      const resultPayload = calculationResult ? (calculationResult as unknown as Record<string, unknown>) : null;
      await save({
        calculationId: forceOverwrite ? existing?.id : undefined,
        tag: typeof inputs.tag === 'string' ? inputs.tag : undefined,
        name: name.trim(),
        description: typeof inputs.description === 'string' ? inputs.description : '',
        inputs,
        results: resultPayload,
        equipmentId,
        equipmentTag,
        calculationMetadata,
        revisionHistory,
      });

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
        reset();
      }, 1000);
    } catch {
      setError('Could not save calculation.');
    }
  };

  const handleSaveToFile = () => {
    const inputs = getValues() as unknown as Record<string, unknown>;
    const fileName = name.trim() || getValues('tag') || calculationMetadata.documentNumber || 'calculation';
    const envelope = buildCalculationFileEnvelope({
      name: fileName,
      inputs,
      metadata: calculationMetadata,
      revisionHistory,
    });
    downloadCalculationFile(envelope, fileName.replace(/[^a-zA-Z0-9-_]/g, '_'));
    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={async (v) => {
        setOpen(v);
        if (v) {
          await fetchList({ includeInactive: false });
        } else {
          reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Calculation</DialogTitle>
          <DialogDescription>
            Name this calculation to reload it later.
            {equipmentId && (
              <span className="block mt-1 text-xs text-blue-600 dark:text-blue-400">
                Linked equipment will be included in this save.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label htmlFor="save-name">Name</Label>
          <Input
            id="save-name"
            placeholder={getValues('tag') || 'e.g. T-101 Heat Loss Case'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
            autoFocus
          />
          {duplicateId && (
            <p className="text-xs text-amber-600">
              A calculation with this name already exists. Rename it or overwrite the existing case.
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveToFile}
            disabled={isSaving || saved}
          >
            Save to File
          </Button>
          {duplicateId && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => { void handleSave(true); }}
              disabled={isSaving || saved}
            >
              Overwrite Existing
            </Button>
          )}
          <Button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={!name.trim() || isSaving || saved}
            className="gap-2"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
            ) : saved ? (
              <><Check className="h-4 w-4" />Saved!</>
            ) : (
              <><Save className="h-4 w-4" />Save</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
