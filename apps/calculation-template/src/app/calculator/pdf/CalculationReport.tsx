/**
 * CalculationReport — @react-pdf/renderer document.
 * Replicates CA-PR-1050.0101 single-page engineering calculation form.
 * Layout (top→bottom of content area):
 *   1. Top header bar — document title + doc code
 *   2. TYPE row — blue background, tag/description
 *   3. Body — input sections on left, outputs on right
 *   4. SKETCH — full-width section below body, spanning both columns
 *   5. Title block — TITLE/PROJECT/CLIENT left | revision grid right | GCME strip bottom
 * Disclaimer strip rotated on left edge.
 *
 * To adapt for a new calculator app: put required inputs in the left data panel,
 * continue optional/overflow inputs in the right panel only when needed, keep
 * calculated outputs grouped in the right panel, and replace the full-width
 * SKETCH placeholder with the same schematic model used by the web SVG.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type {
  CalculationInput,
  CalculationMetadata,
  CalculationResult,
  RevisionRecord,
} from '@/types'

export interface CalculationReportProps {
  input: CalculationInput
  result: CalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const NAVY      = '#1f3864'
const BLACK     = '#000000'
const VALUE_BG  = '#dbeafe'
const WHITE     = '#ffffff'
const GUIDE     = '#374151'
const MUTED     = '#6b7280'
const BW        = 0.5   // light row border
const HB        = 1     // heavy section border
const DOCUMENT_CODE = 'CA-PR-1050-0101'
const DISCLAIMER =
  'This document is confidential proprietary and/or legally privileged, intended to be used within GCME Co.,Ltd. Unintended recipients are not allowed to distribute, copy, modify, retransmit, disseminate or use this document and/or information.'

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    padding: 0,
    color: BLACK,
    lineHeight: 1.3,
  },
  pageOuterFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 8,
    borderColor: NAVY,
  },
  outerBorder: {
    flex: 1,
    marginTop: 8,
    marginRight: 8,
    marginBottom: 8,
    marginLeft: 18,
    borderWidth: HB,
    borderColor: BLACK,
    flexDirection: 'column',
  },
  // ── Top header bar
  topHeader: {
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: HB,
    borderBottomColor: BLACK,
    position: 'relative',
  },
  topHeaderTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  topHeaderCode: {
    position: 'absolute',
    right: 6,
    top: 4,
    fontSize: 5,
    color: MUTED,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Type row
  typeRow: {
    flexDirection: 'row',
    minHeight: 14,
    borderBottomWidth: HB,
    borderBottomColor: BLACK,
  },
  typeLabel: {
    width: 34,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRightWidth: BW,
    borderRightColor: BLACK,
    color: GUIDE,
  },
  typeValue: {
    flex: 1,
    backgroundColor: VALUE_BG,
    textAlign: 'center',
    fontSize: 5.8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  // ── Body: input panel left, output panel right
  bodyRow: {
    flexDirection: 'row',
    borderBottomWidth: HB,
    borderBottomColor: BLACK,
  },
  leftCol: {
    flex: 1,
    borderRightWidth: HB,
    borderRightColor: BLACK,
  },
  rightCol: {
    flex: 1,
  },
  // ── Section header
  sectionHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  sectionHeaderText: {
    color: WHITE,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Data row
  row: {
    flexDirection: 'row',
    borderBottomWidth: BW,
    borderBottomColor: '#d1d5db',
    minHeight: 10,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rowLabel: {
    flex: 2.9,
    fontSize: 6,
    color: GUIDE,
  },
  rowValueBox: {
    flex: 1.55,
    minHeight: 8,
    borderWidth: BW,
    borderColor: '#93c5fd',
    backgroundColor: VALUE_BG,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  rowValueText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  rowUnit: {
    flex: 0.7,
    fontSize: 6,
    color: MUTED,
    textAlign: 'right',
    paddingLeft: 2,
  },
  // ── Sketch: full-width section below the two data panels
  sketchSection: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 245,
    borderBottomWidth: HB,
    borderBottomColor: BLACK,
  },
  sketchBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  sketchCaption: {
    fontSize: 5.5,
    color: MUTED,
    textAlign: 'center',
    marginTop: 2,
  },
  // ── Disclaimer strip
  disclaimerWrap: {
    position: 'absolute',
    left: 7,
    top: 62,
    bottom: 74,
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerText: {
    width: 800,
    fontSize: 5.6,
    color: '#dc2626',
    textAlign: 'center',
    transform: 'rotate(-90deg)',
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function present(value: unknown): string {
  if (typeof value === 'string') return value.trim() || '—'
  if (typeof value === 'number') return isFinite(value) ? String(value) : '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return '—'
}

function joinPersonDate(person: string | undefined, date: string | undefined): string {
  return [person?.trim(), date?.trim()].filter(Boolean).join('  ')
}

// ─── Primitive components ────────────────────────────────────────────────────

function DataRow({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value?: string | null
  unit?: string
  highlight?: boolean
}) {
  return (
    <View style={S.row}>
      <Text style={S.rowLabel}>{label}</Text>
      <View style={highlight ? S.rowValueBox : [S.rowValueBox, { backgroundColor: WHITE }]}>
        <Text style={S.rowValueText}>{value ?? '—'}</Text>
      </View>
      <Text style={S.rowUnit}>{unit ?? ''}</Text>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <View style={S.sectionHeader}>
        <Text style={S.sectionHeaderText}>{title}</Text>
      </View>
      <View>{children}</View>
    </View>
  )
}

// ─── Title block ─────────────────────────────────────────────────────────────

function TitleBlock({
  metadata,
  revisions,
}: {
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}) {
  const rows: (RevisionRecord | null)[] = [
    ...revisions.slice(0, 3),
    ...Array(Math.max(0, 3 - revisions.length)).fill(null),
  ]
  const trS = {
    flexDirection: 'row' as const,
    borderBottomWidth: BW,
    borderBottomColor: BLACK,
    minHeight: 14,
  }
  const tlCellS = {
    width: 48,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRightWidth: BW,
    borderRightColor: BLACK,
  }
  const tlTextS = {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold' as const,
    color: GUIDE,
  }
  const tvCellS = {
    flex: 1,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
    paddingVertical: 2,
  }
  const tvTextS = { fontSize: 7 }

  const revHeaderRowS = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderBottomWidth: BW,
    borderBottomColor: BLACK,
    minHeight: 12,
  }
  const revDataRowS = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: 10,
  }
  const revHeaderCellS = {
    flex: 1,
    minHeight: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRightWidth: BW,
    borderRightColor: BLACK,
    backgroundColor: '#f3f4f6',
  }
  const revDataCellS = {
    flex: 1,
    minHeight: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRightWidth: BW,
    borderRightColor: BLACK,
  }

  return (
    <View style={{ borderTopWidth: HB, borderTopColor: BLACK }}>
      {/* Row: TITLE / PROJECT / CLIENT (left) | revision columns (right) */}
      <View style={{ flexDirection: 'row', borderBottomWidth: HB, borderBottomColor: BLACK }}>
        <View style={{ flex: 3, borderRightWidth: HB, borderRightColor: BLACK }}>
          <View style={trS}>
            <View style={tlCellS}>
              <Text style={tlTextS}>TITLE</Text>
            </View>
            <View style={tvCellS}>
              <Text style={tvTextS}>{metadata.title || ''}</Text>
            </View>
          </View>
          <View style={trS}>
            <View style={tlCellS}>
              <Text style={tlTextS}>PROJECT</Text>
            </View>
            <View style={tvCellS}>
              <Text style={tvTextS}>{metadata.projectName || ''}</Text>
            </View>
          </View>
          <View style={{ ...trS, borderBottomWidth: 0 }}>
            <View style={tlCellS}>
              <Text style={tlTextS}>CLIENT</Text>
            </View>
            <View style={tvCellS}>
              <Text style={tvTextS}>{metadata.client || ''}</Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 2 }}>
          <View style={revHeaderRowS}>
            <View style={revHeaderCellS}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: GUIDE, textAlign: 'center' }}>REV.</Text>
            </View>
            <View style={revHeaderCellS}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: GUIDE, textAlign: 'center' }}>BY / DATE</Text>
            </View>
            <View style={revHeaderCellS}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: GUIDE, textAlign: 'center' }}>CHKD / DATE</Text>
            </View>
            <View style={{ ...revHeaderCellS, borderRightWidth: 0 }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: GUIDE, textAlign: 'center' }}>APPD / DATE</Text>
            </View>
          </View>
          {rows.map((rev, i) => (
            <View
              key={i}
              style={{
                ...revDataRowS,
                borderBottomWidth: i < rows.length - 1 ? BW : 0,
                borderBottomColor: '#e5e7eb',
              }}
            >
              <View style={revDataCellS}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>{rev?.rev ?? ''}</Text>
              </View>
              <View style={revDataCellS}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>
                  {rev ? joinPersonDate(rev.by, rev.byDate) : ''}
                </Text>
              </View>
              <View style={revDataCellS}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>
                  {rev ? joinPersonDate(rev.checkedBy, rev.checkedDate) : ''}
                </Text>
              </View>
              <View style={{ ...revDataCellS, borderRightWidth: 0 }}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>
                  {rev ? joinPersonDate(rev.approvedBy, rev.approvedDate) : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* GCME brand strip */}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 3, flexDirection: 'row', borderRightWidth: HB, borderRightColor: BLACK }}>
          <View style={{ width: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: BW, borderRightColor: BLACK, backgroundColor: '#e5e7eb', padding: 4 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: GUIDE, textAlign: 'center' }}>GCME</Text>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 4, justifyContent: 'center' }}>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold' }}>GC MAINTENANCE &amp; ENGINEERING COMPANY LIMITED</Text>
          </View>
        </View>
        <View style={{ flex: 2, flexDirection: 'row' }}>
          <View style={{ flex: 1, paddingHorizontal: 3, paddingVertical: 2, borderRightWidth: BW, borderRightColor: BLACK }}>
            <Text style={{ fontSize: 5.5, color: MUTED }}>Doc No: {metadata.documentNumber || DOCUMENT_CODE}</Text>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 3, paddingVertical: 2 }}>
            <Text style={{ fontSize: 5.5, color: MUTED }}>Project: {metadata.projectNumber || '—'}</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: NAVY, paddingHorizontal: 4, paddingVertical: 2 }}>
        <Text style={{ fontSize: 5.5, color: WHITE }}>{DOCUMENT_CODE}</Text>
        <Text style={{ fontSize: 5.5, color: WHITE }}>VALIDATION REPORT : {DOCUMENT_CODE}</Text>
      </View>
    </View>
  )
}

// ─── Document ────────────────────────────────────────────────────────────────

export function CalculationReport({
  input,
  result,
  metadata,
  revisions,
}: CalculationReportProps) {
  const tag = present(input.tag)

  return (
    <Document title={`Calculation Report — ${tag}`}>
      <Page size="A4" style={S.page}>
        <View style={S.pageOuterFrame} fixed />
        <View style={S.disclaimerWrap} fixed>
          <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
        </View>

        <View style={S.outerBorder}>
          {/* ── Top header bar ── */}
          <View style={S.topHeader}>
            <Text style={S.topHeaderTitle}>Calculation Report</Text>
            <Text style={S.topHeaderCode}>{DOCUMENT_CODE}</Text>
          </View>

          {/* ── Type row ── */}
          <View style={S.typeRow}>
            <View style={S.typeLabel}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: GUIDE }}>TYPE</Text>
            </View>
            <View style={S.typeValue}>
              <Text>{tag}</Text>
            </View>
          </View>

          {/* ── Body: inputs left, outputs right ── */}
          <View style={S.bodyRow}>
            <View style={S.leftCol}>
              <Section title="I. INPUT SUMMARY">
                <DataRow label="Tag" value={present(input.tag)} />
                <DataRow label="Description" value={present(input.description)} />
              </Section>

              {/* Continue long input lists here before moving optional overflow inputs to the right panel. */}
              <Section title="II. INPUT DETAILS">
                <DataRow label="Primary input" value="—" />
                <DataRow label="Secondary input" value="—" />
              </Section>
            </View>

            <View style={S.rightCol}>
              <Section title="III. CALCULATION OUTPUT">
                <DataRow label="Status" value={present(result.status)} />
                {'calculatedAt' in result && (
                  <DataRow label="Calculated At" value={present(result.calculatedAt)} />
                )}
              </Section>

              <Section title="IV. OUTPUT DETAILS">
                <DataRow label="Main result" value="—" highlight />
                <DataRow label="Design margin" value="—" />
              </Section>
            </View>
          </View>

          {/* ── Sketch spans both data columns ── */}
          <View style={S.sketchSection}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionHeaderText}>SKETCH</Text>
            </View>
            <View style={S.sketchBody}>
              <Text style={{ fontSize: 8, color: MUTED, textAlign: 'center' }}>
                Replace with app-specific schematic rendered from the same model as the web SVG
              </Text>
              <Text style={S.sketchCaption}>
                Sketch area spans both columns and stays centered in the available space
              </Text>
            </View>
          </View>

          {/* ── Title block (bottom) ── */}
          <TitleBlock metadata={metadata} revisions={revisions} />
        </View>
      </Page>
    </Document>
  )
}
