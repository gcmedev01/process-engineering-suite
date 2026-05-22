'use client';

import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Loader2, RefreshCw, Trash2, RotateCcw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSavedCalculations } from '@/lib/hooks/useSavedCalculations';
import { readCalculationFile } from '@/lib/calculationFile';
import type { CalculationMetadata, RevisionRecord, HeatTransferCalculationInput } from '@/types';

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: '',
  documentNumber: '',
  title: '',
  projectName: '',
  client: '',
};

interface Props {
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[]) => void;
  onInputsLoaded?: (inputs: HeatTransferCalculationInput) => void;
  onEquipmentLinked?: (equipmentId: string | null, equipmentTag?: string | null) => void;
}

export function LoadCalculationButton({
  controlledOpen,
  onControlledOpenChange,
  onCalculationLoaded,
  onInputsLoaded,
  onEquipmentLinked,
}: Props) {
  const { reset } = useFormContext<HeatTransferCalculationInput>();
  const {
    fetchList,
    softDelete,
    restore,
    savedItems,
    isLoading,
    isDeleting,
    isRestoring,
    error,
  } = useSavedCalculations();

  const open = controlledOpen ?? false;
  const setOpen = (v: boolean) => onControlledOpenChange?.(v);

  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadItems = async (nextShowDeleted = showDeleted) => {
    await fetchList({ includeInactive: nextShowDeleted, q: search.trim() || undefined });
  };

  const handleOpen = async (v: boolean) => {
    setOpen(v);
    if (v) {
      await loadItems();
    } else {
      setSearch('');
      setShowDeleted(false);
      setFileError(null);
    }
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = showDeleted ? savedItems : savedItems.filter((item) => item.isActive);
    if (!query) return base;
    return base.filter((item) => {
      const tag = String(item.inputs.tag ?? '').toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query) ||
        tag.includes(query)
      );
    });
  }, [savedItems, search, showDeleted]);

  const handleSelect = (item: (typeof filteredItems)[number]) => {
    const inputs = item.inputs as unknown as HeatTransferCalculationInput;
    reset(inputs, { keepDefaultValues: false });

    const metadata = item.calculationMetadata ?? EMPTY_METADATA;
    const revisions = item.revisionHistory ?? [];
    onCalculationLoaded(metadata, revisions);
    onInputsLoaded?.(inputs);
    onEquipmentLinked?.(item.equipmentId ?? null, item.equipmentTag ?? null);

    setOpen(false);
  };

  const handleFilePick = () => {
    setFileError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const payload = await readCalculationFile(file);
      const inputs = payload.inputs as unknown as HeatTransferCalculationInput;
      reset(inputs, { keepDefaultValues: false });
      onCalculationLoaded(payload.metadata, payload.revisionHistory);
      onInputsLoaded?.(inputs);
      onEquipmentLinked?.(null, null);
      setOpen(false);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not load file.');
    }
  };

  const handleDelete = async (calculationId: string) => {
    if (!window.confirm('Soft delete this saved calculation?')) return;
    await softDelete(calculationId);
    await loadItems(showDeleted);
  };

  const handleRestore = async (calculationId: string) => {
    await restore(calculationId);
    await loadItems(showDeleted);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { void handleOpen(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Saved Calculation</DialogTitle>
          <DialogDescription>
            Select a calculation to restore its inputs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 -mt-1 mb-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, tag"
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { void loadItems(showDeleted); }}
            disabled={isLoading}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFilePick}
              className="text-xs"
            >
              Load from File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => { void handleFileChange(event); }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = !showDeleted;
                setShowDeleted(next);
                void loadItems(next);
              }}
              className="text-xs"
            >
              {showDeleted ? 'Hide deleted' : 'Show deleted'}
            </Button>
          </div>
        </div>

        {(error || fileError) && <p className="text-xs text-destructive mb-2">{fileError ?? error}</p>}

        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No saved calculations found.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredItems.map((item) => (
                <div key={item.id} className="w-full px-2 py-1 rounded-md hover:bg-accent/60 transition-colors">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className="flex-1 text-left px-1 py-1"
                      onClick={() => handleSelect(item)}
                      disabled={!item.isActive}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</span>
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                          {item.tag}
                        </span>
                        {!item.isActive && (
                          <span className="text-[10px] uppercase tracking-wide text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">deleted</span>
                        )}
                        {item.equipmentId && (
                          <span className="text-[10px] flex items-center gap-0.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                            <Link2 className="h-2.5 w-2.5" />
                            linked equipment
                          </span>
                        )}
                      </div>
                    </button>

                    {item.isActive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-1 text-muted-foreground hover:text-destructive"
                        onClick={() => { void handleDelete(item.id); }}
                        disabled={isDeleting}
                        aria-label={`Delete ${item.name}`}
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-1 text-muted-foreground hover:text-foreground"
                        onClick={() => { void handleRestore(item.id); }}
                        disabled={isRestoring}
                        aria-label={`Restore ${item.name}`}
                      >
                        {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
