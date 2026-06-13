import { describe, expect, it } from 'vitest'
import {
  CALCULATION_FILE_APP,
  CALCULATION_FILE_KIND,
  CALCULATION_FILE_SCHEMA_VERSION,
  buildCalculationFileEnvelope,
  readCalculationFile,
} from '@/lib/calculationFile'

function makeFile(text: string): File {
  return { text: async () => text } as unknown as File
}

describe('calculationFile helpers', () => {
  it('builds a valid envelope and reads it back', async () => {
    const envelope = buildCalculationFileEnvelope({
      name: 'Template case',
      inputs: { tag: 'C-100' },
      metadata: {
        projectNumber: 'P-1',
        documentNumber: 'DOC-1',
        title: 'Calc',
        projectName: 'Project',
        client: 'Client',
      },
      revisionHistory: [{ rev: 'A', by: 'EE', checkedBy: '', approvedBy: '', byDate: '2026-03-14' }],
    })

    expect(envelope.kind).toBe(CALCULATION_FILE_KIND)
    expect(envelope.schemaVersion).toBe(CALCULATION_FILE_SCHEMA_VERSION)
    expect(envelope.app).toBe(CALCULATION_FILE_APP)

    const file = makeFile(JSON.stringify(envelope))
    const loaded = await readCalculationFile(file)
    expect(loaded).toMatchObject(envelope)
    expect(loaded.revisionHistory[0]).toMatchObject({
      rev: 'A',
      by: 'EE',
      byDate: '2026-03-14',
      checkedDate: '',
      approvedDate: '',
    })
  })

  it('rejects a file exported from a different app', async () => {
    const file = makeFile(JSON.stringify({
      kind: CALCULATION_FILE_KIND,
      schemaVersion: CALCULATION_FILE_SCHEMA_VERSION,
      app: 'vessels-calculation',
      savedAt: new Date().toISOString(),
      name: 'Wrong',
      inputs: { tag: 'V-101' },
      metadata: {},
      revisionHistory: [],
    }))

    await expect(readCalculationFile(file)).rejects.toThrow('different calculator app')
  })

  it('rejects malformed json', async () => {
    const file = makeFile('{bad-json')
    await expect(readCalculationFile(file)).rejects.toThrow()
  })
})
