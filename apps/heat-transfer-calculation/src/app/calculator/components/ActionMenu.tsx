'use client';

import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Menu,
  RotateCcw,
  FileDown,
  Loader2,
  LinkIcon,
  Upload,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/apiClient';
import { SaveCalculationButton } from './SaveCalculationButton';
import { LoadCalculationButton } from './LoadCalculationButton';
import { EquipmentLinkButton } from './EquipmentLinkButton';
import type {
  CalculationInput,
  CalculationMetadata,
  RevisionRecord,
  CalculationResult,
  DerivedGeometry,
  HeatTransferCalculationInput,
  HeatTransferCalculationResult,
} from '@/types';

interface ActionMenuProps {
  onClear: () => void;
  calculationMetadata: CalculationMetadata;
  revisionHistory: RevisionRecord[];
  onCalculationLoaded: (metadata: CalculationMetadata, revisionHistory: RevisionRecord[]) => void;
  onInputsLoaded?: (inputs: HeatTransferCalculationInput) => void;
  calculationResult: HeatTransferCalculationResult | null;
  derivedGeometry?: DerivedGeometry | null;
  linkedEquipmentId?: string | null;
  linkedEquipmentTag?: string | null;
  onEquipmentLinked?: (equipmentId: string | null, equipmentTag?: string | null) => void;
  showEquipmentActions?: boolean;
}

function latestRevisionValue(revisions: RevisionRecord[]): string | null {
  const dated = revisions
    .map((item) => {
      const rev = item.rev?.trim();
      const rawDate = item.byDate?.trim() || item.checkedDate?.trim() || item.approvedDate?.trim() || '';
      const dateValue = rawDate ? Date.parse(rawDate) : Number.NaN;
      return { rev, dateValue };
    })
    .filter((item) => item.rev && Number.isFinite(item.dateValue))
    .sort((a, b) => b.dateValue - a.dateValue);

  if (dated.length > 0) return dated[0].rev ?? null;

  return revisions.find((item) => item.rev?.trim())?.rev?.trim() ?? null;
}

export function ActionMenu({
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
  calculationResult,
  derivedGeometry,
  linkedEquipmentId,
  linkedEquipmentTag,
  onEquipmentLinked,
  onInputsLoaded,
  showEquipmentActions = true,
}: ActionMenuProps) {
  const { getValues } = useFormContext<HeatTransferCalculationInput>();

  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleExportPdf = async () => {
    if (!calculationResult) return;

    setPdfLoading(true);
    try {
      const [{ pdf }, { CalculationReport }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../pdf/CalculationReport'),
      ]);

      const input = getValues();
      const blob = await pdf(
        <CalculationReport
          input={input}
          result={calculationResult}
          metadata={calculationMetadata}
          revisions={revisionHistory}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileBase = (
        calculationMetadata.documentNumber?.trim() ||
        input.tag?.trim() ||
        'report'
      ).replace(/[^a-zA-Z0-9-_]/g, '_');
      const latestRev = latestRevisionValue(revisionHistory);
      const revSuffix = latestRev ? `_Rev.${latestRev.replace(/[^a-zA-Z0-9-_]/g, '_')}` : '';
      a.download = `${fileBase}${revSuffix}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  const resolveLinkedEquipmentTag = async (): Promise<string | null> => {
    if (linkedEquipmentTag) {
      return linkedEquipmentTag;
    }
    if (!linkedEquipmentId) {
      return null;
    }

    const [tanks, vessels] = await Promise.all([
      apiClient.engineeringObjects.list({ objectType: 'TANK', includeInactive: true }),
      apiClient.engineeringObjects.list({ objectType: 'VESSEL', includeInactive: true }),
    ]);
    const found = [...tanks, ...vessels].find((obj) => obj.id === linkedEquipmentId);
    return found?.tag ?? null;
  };

  const handleUpdateEquipment = async () => {
    if (!linkedEquipmentId) return;
    setUpdateError(null);
    setUpdated(false);
    setIsUpdating(true);
    try {
      const resolvedTag = await resolveLinkedEquipmentTag();
      if (!resolvedTag) {
        throw new Error('Linked engineering object tag could not be resolved');
      }

      const current = await apiClient.engineeringObjects.get(resolvedTag);
      const currentProperties = (current.properties ?? {}) as Record<string, unknown>;
      const existingDetails = (currentProperties.details ?? {}) as Record<string, unknown>;
      const values = getValues() as CalculationInput;
      const result = calculationResult as CalculationResult | null;
      const normalLiquidLevelPct = values.tankHeight > 0
        ? Math.round((values.liquidLevel / values.tankHeight) * 10000) / 100
        : null;

      const details: Record<string, unknown> = {
        ...existingDetails,
        innerDiameterMm: values.tankDiameter,
        heightMm: values.tankHeight,
        liquidLevelMm: values.liquidLevel,
        normalLiquidLevelPct,
        roofType: values.tankRoofType ?? null,
        roofHeight: values.roofHeight ?? null,
        wallThicknessMm: values.wallThickness,
        insulationThicknessMm: values.insulationThickness,
        insulationConductivityWMK: values.insulationConductivity,
        surfaceEmissivity: values.surfaceEmissivity,
        totalHeatLossW: result?.totalHeatLoss ?? null,
        totalHeatTransferAreaM2: result?.totalArea ?? null,
        heatTransferGeometry: derivedGeometry ?? null,
        heatTransferCalculation: {
          inputs: values,
          result,
          calculationMetadata,
          revisionHistory,
          syncedAt: new Date().toISOString(),
        },
      };

      await apiClient.engineeringObjects.upsert(resolvedTag, {
        object_type: current.object_type,
        status: current.status ?? undefined,
        properties: {
          ...currentProperties,
          details,
        },
      });

      setUpdated(true);
      setTimeout(() => setUpdated(false), 1600);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update equipment');
      setTimeout(() => setUpdateError(null), 4000);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateLabel = useMemo(() => {
    if (isUpdating) return 'Updating...';
    if (updated) return 'Updated';
    return 'Update Equipment';
  }, [isUpdating, updated]);

  const UpdateIcon = isUpdating ? Loader2 : updated ? Check : Upload;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Menu className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
            Save calculation…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLoadOpen(true)}>
            Load calculation…
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {showEquipmentActions && (
            <>
              <DropdownMenuItem onSelect={() => setLinkOpen(true)} className="gap-2">
                <LinkIcon className={`h-4 w-4 ${linkedEquipmentId ? 'text-green-600' : ''}`} />
                {linkedEquipmentTag ? `Linked: ${linkedEquipmentTag}` : linkedEquipmentId ? `Linked: ${linkedEquipmentId}` : 'Link equipment…'}
              </DropdownMenuItem>
              {linkedEquipmentId && (
                <DropdownMenuItem onSelect={() => { void handleUpdateEquipment(); }} className="gap-2" disabled={isUpdating}>
                  <UpdateIcon className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  {updateLabel}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onSelect={handleExportPdf} disabled={!calculationResult || pdfLoading}>
            {pdfLoading
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <FileDown className="h-4 w-4 mr-2" />
            }
            {pdfLoading ? 'Generating PDF...' : 'Export PDF...'}
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={onClear}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
        onInputsLoaded={onInputsLoaded}
        onEquipmentLinked={onEquipmentLinked}
      />
      {showEquipmentActions && onEquipmentLinked && (
        <EquipmentLinkButton
          controlledOpen={linkOpen}
          onControlledOpenChange={setLinkOpen}
          linkedEquipmentId={linkedEquipmentId ?? null}
          linkedEquipmentTag={linkedEquipmentTag ?? null}
          onEquipmentLinked={onEquipmentLinked}
        />
      )}
    </>
  );
}
