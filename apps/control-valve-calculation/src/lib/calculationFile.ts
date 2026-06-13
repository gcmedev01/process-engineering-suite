import type { CalculationMetadata, RevisionRecord } from '@/types'

export const CALCULATION_FILE_KIND = 'pes-calculation-file'
export const CALCULATION_FILE_SCHEMA_VERSION = 1
export const CALCULATION_FILE_APP = 'control-valve-calculation'

export interface CalculationFileEnvelope {
  kind: typeof CALCULATION_FILE_KIND
  schemaVersion: typeof CALCULATION_FILE_SCHEMA_VERSION
  app: typeof CALCULATION_FILE_APP
  savedAt: string
  name: string
  inputs: Record<string, unknown>
  metadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
}

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: '',
  documentNumber: '',
  title: '',
  projectName: '',
  client: '',
}

function sanitizeRevisionHistory(value: unknown): RevisionRecord[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      rev: typeof item.rev === 'string' ? item.rev : '',
      by: typeof item.by === 'string' ? item.by : '',
      byDate: typeof item.byDate === 'string' ? item.byDate : '',
      checkedBy: typeof item.checkedBy === 'string' ? item.checkedBy : '',
      checkedDate: typeof item.checkedDate === 'string' ? item.checkedDate : '',
      approvedBy: typeof item.approvedBy === 'string' ? item.approvedBy : '',
      approvedDate: typeof item.approvedDate === 'string' ? item.approvedDate : '',
    }))
}

export function buildCalculationFileEnvelope({
  name,
  inputs,
  metadata,
  revisionHistory,
}: {
  name: string
  inputs: Record<string, unknown>
  metadata?: CalculationMetadata
  revisionHistory?: RevisionRecord[]
}): CalculationFileEnvelope {
  return {
    kind: CALCULATION_FILE_KIND,
    schemaVersion: CALCULATION_FILE_SCHEMA_VERSION,
    app: CALCULATION_FILE_APP,
    savedAt: new Date().toISOString(),
    name,
    inputs,
    metadata: metadata ?? EMPTY_METADATA,
    revisionHistory: revisionHistory ?? [],
  }
}

export function downloadCalculationFile(envelope: CalculationFileEnvelope, fileBase: string): void {
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileBase}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text()
  }
  return new Response(file).text()
}

export async function readCalculationFile(file: File): Promise<CalculationFileEnvelope> {
  const raw = JSON.parse(await readFileText(file)) as Record<string, unknown>

  if (raw.kind !== CALCULATION_FILE_KIND) {
    throw new Error('This file is not a PES calculation export.')
  }
  if (raw.schemaVersion !== CALCULATION_FILE_SCHEMA_VERSION) {
    throw new Error(`Unsupported file schema version: ${String(raw.schemaVersion)}`)
  }
  if (raw.app !== CALCULATION_FILE_APP) {
    throw new Error('This file was exported from a different calculator app.')
  }
  if (typeof raw.inputs !== 'object' || raw.inputs === null) {
    throw new Error('Calculation file is missing inputs.')
  }

  return {
    kind: CALCULATION_FILE_KIND,
    schemaVersion: CALCULATION_FILE_SCHEMA_VERSION,
    app: CALCULATION_FILE_APP,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    name: typeof raw.name === 'string' ? raw.name : 'Imported Calculation',
    inputs: raw.inputs as Record<string, unknown>,
    metadata:
      typeof raw.metadata === 'object' && raw.metadata !== null
        ? { ...EMPTY_METADATA, ...(raw.metadata as Partial<CalculationMetadata>) }
        : EMPTY_METADATA,
    revisionHistory: sanitizeRevisionHistory(raw.revisionHistory),
  }
}
