/**
 * CalculationReport — @react-pdf/renderer document.
 * Replicates CA-PR-1050.0101 single-page engineering calculation form.
 * Layout (top→bottom of content area):
 *   1. Top header bar — document title + doc code
 *   2. TYPE row — blue background, mode label + tag
 *   3. INPUT SECTIONS — all inputs, full width (I GEOMETRY, II CONDITIONS, III PROPERTIES)
 *   4. SKETCH — spans full width below inputs
 *   5. Title block — TITLE/PROJECT/CLIENT | revision grid | GCME strip
 * Disclaimer strip rotated on left edge.
 */

import {
  Document,
  Circle,
  Ellipse,
  G,
  Line,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer'
import {
  buildHorizontalTankSchematic,
  buildPipeSchematic,
  buildVerticalTankSchematic,
  type CircleSpec,
  type EllipseSpec,
  type HeatSchematicModel,
  type LineSpec,
  type PathSpec,
  type RectSpec,
} from '@/lib/schematics/heatSchematicModel'
import type {
  CalculationInput,
  CalculationMetadata,
  CalculationResult,
  HorizontalTankInput,
  HorizontalTankResult,
  HorizontalTankSurfaceSnap,
  PerSurfaceResult,
  PipeCalculationInput,
  PipeCalculationResult,
  RevisionRecord,
} from '@/types'

export type ReportInput = CalculationInput | PipeCalculationInput | HorizontalTankInput
export type ReportResult = CalculationResult | PipeCalculationResult | HorizontalTankResult

export interface CalculationReportProps {
  input: ReportInput
  result: ReportResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const NAVY      = '#1f3864'
const BLACK     = '#000000'
const VALUE_BG  = '#dbeafe'
const ROW_ALT   = '#E7EFF6'
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
  // ── Top header bar (document title + doc code)
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
  // ── Type row (mode indicator with blue background)
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
  // ── Body: two equal data panels
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
  // ── Sketch section (full width)
  sketchSection: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 245,
    borderBottomWidth: HB,
    borderBottomColor: BLACK,
  },
  sketchHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  sketchHeaderText: {
    color: WHITE,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
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
    marginTop: 1,
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

function fmt(value: number | null | undefined, decimals = 4): string {
  if (value == null || !isFinite(value)) return '—'
  return value.toFixed(decimals)
}

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

// ─── Schematic rendering ────────────────────────────────────────────────────

const PDF_STROKE   = '#1f3864'
const PDF_GUIDE    = '#374151'
const PDF_LIQUID   = '#93c5fd'
const PDF_DRY      = '#e2e8f0'
const PDF_INSUL    = '#fbbf24'
const PDF_METAL    = '#94a3b8'

function PdfSchematic({ input, mode }: { input: ReportInput; mode: ReportMode }) {
  const schematicWidth = 440
  const schematicHeight = mode === 'pipe' ? 210 : 240
  const schematicPadding = mode === 'pipe' ? 24 : 30

  const raw = mode === 'pipe'
    ? buildPipeSchematic(input as PipeCalculationInput, schematicWidth, schematicHeight, schematicPadding)
    : mode === 'horizontal'
      ? buildHorizontalTankSchematic(input as HorizontalTankInput, schematicWidth, schematicHeight, schematicPadding)
      : buildVerticalTankSchematic(input as CalculationInput, schematicWidth, schematicHeight, schematicPadding)

  if (!raw) return null

  const model = raw

  return (
    <Svg viewBox={`0 0 ${model.width} ${model.height}`} style={{ width: schematicWidth, height: schematicHeight }}>
      {/* Zone fills */}
      {model.zoneFills.rects.map((r) => (
        <Rect key={r.key} x={r.x} y={r.y} width={r.width} height={r.height}
          fill={fillColor(r.tone)} opacity={r.opacity ?? 1} />
      ))}
      {model.zoneFills.circles.map((c) => (
        <Circle key={c.key} cx={c.cx} cy={c.cy} r={c.r}
          fill={fillColor(c.tone)} opacity={c.opacity ?? 1} />
      ))}
      {model.zoneFills.ellipses.map((e) => (
        <Ellipse key={e.key} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry}
          fill={fillColor(e.tone)} opacity={e.opacity ?? 1} />
      ))}
      {model.zoneFills.paths.map((p) => (
        <Path key={p.key} d={p.d} fill={fillColor(p.tone)} opacity={p.opacity ?? 1} />
      ))}

      {/* Outlines */}
      {model.outlines.rects.map((r) => (
        <Rect key={r.key} x={r.x} y={r.y} width={r.width} height={r.height}
          rx={r.rx} ry={r.ry} stroke={PDF_STROKE} strokeWidth={2} fill="none" />
      ))}
      {model.outlines.circles.map((c) => (
        <Circle key={c.key} cx={c.cx} cy={c.cy} r={c.r}
          stroke={PDF_STROKE} strokeWidth={2} fill="none" />
      ))}
      {model.outlines.ellipses.map((e) => (
        <Ellipse key={e.key} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry}
          stroke={PDF_STROKE} strokeWidth={2} fill="none" />
      ))}
      {model.outlines.paths.map((p) => (
        <Path key={p.key} d={p.d} stroke={PDF_STROKE} strokeWidth={2} fill="none" />
      ))}
      {model.outlines.lines.map((l) => (
        <Line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={PDF_STROKE} strokeWidth={l.strokeWidth ?? 1.2}
          strokeDasharray={l.dashed} opacity={l.opacity ?? 1} />
      ))}

      {/* Guide lines */}
      {model.guideLines.map((g) => (
        <Line key={g.key} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
          stroke={PDF_GUIDE} strokeWidth={0.75} opacity={g.opacity ?? 0.55} />
      ))}

      {/* Levels */}
      {model.levels.map((lv) => (
        <G key={lv.key}>
          <Line x1={lv.x0} y1={lv.y} x2={lv.x1} y2={lv.y}
            stroke={lv.color} strokeWidth={1.5} strokeDasharray={lv.dashed ? '5 4' : undefined} />
          <Text x={lv.x1 + 18} y={lv.y - 4} fill={lv.color} style={{ fontSize: 9 }}>
            {lv.label}
          </Text>
        </G>
      ))}

      {/* Annotations */}
      {model.annotations.map((ann) => {
        const mx = (ann.x1 + ann.x2) / 2
        const my = (ann.y1 + ann.y2) / 2
        const labelY = ann.vertical ? my : my - 6
        const labelX = ann.vertical ? (ann.labelSide === 'end' ? mx + 10 : mx - 10) : mx
        const anchor = ann.vertical ? (ann.labelSide === 'end' ? 'start' : 'end') : 'middle'
        return (
          <G key={ann.key}>
            <Line x1={ann.x1} y1={ann.y1} x2={ann.x2} y2={ann.y2}
              stroke={PDF_GUIDE} strokeWidth={1.2} />
            <Text x={labelX} y={labelY} fill={PDF_GUIDE} style={{ fontSize: 9 }} textAnchor={anchor}>
              {ann.label}
            </Text>
          </G>
        )
      })}

      {/* Labels */}
      {model.labels.map((lb) => (
        <Text key={lb.key} x={lb.x} y={lb.y}
          textAnchor={lb.anchor ?? 'middle'}
          style={{ fontSize: Math.min(lb.size ?? 10, 8) }}
          fill={PDF_GUIDE}>
          {lb.text}
        </Text>
      ))}
    </Svg>
  )
}

function fillColor(tone?: string): string {
  switch (tone) {
    case 'liquid':    return PDF_LIQUID
    case 'wet':       return '#7dd3fc'
    case 'dry':       return PDF_DRY
    case 'insulation': return PDF_INSUL
    case 'metal':     return PDF_METAL
    default:          return '#cbd5e1'
  }
}

// ─── Mode detection ─────────────────────────────────────────────────────────

type ReportMode = 'vertical' | 'pipe' | 'horizontal'

function isPipeResult(r: ReportResult): r is PipeCalculationResult {
  return 'surfaceArea' in r && 'outletTemp' in r
}
function isHorizontalTankResult(r: ReportResult): r is HorizontalTankResult {
  return 'dryHead' in r && 'wetHead' in r
}
function isVerticalTankResult(r: ReportResult): r is CalculationResult {
  return 'roof' in r && 'floor' in r
}

function detectMode(input: ReportInput, result: ReportResult): ReportMode {
  const explicitMode = (input as unknown as Record<string, unknown>).mode
  if (explicitMode === 'pipe') return 'pipe'
  if (explicitMode === 'horizontal') return 'horizontal'
  if (explicitMode === 'vertical' || explicitMode === 'tank' || explicitMode === 'storage-tank') return 'vertical'
  if (isPipeResult(result)) return 'pipe'
  if (isHorizontalTankResult(result)) return 'horizontal'
  return 'vertical'
}

// ─── Input helpers ───────────────────────────────────────────────────────────

function valueOf(input: ReportInput, key: string): unknown {
  return (input as unknown as Record<string, unknown>)[key]
}

// ─── Result helpers ──────────────────────────────────────────────────────────

function isPipeResultB(r: ReportResult): r is PipeCalculationResult {
  return 'surfaceArea' in r && 'outletTemp' in r
}
function isHorizontalTankResultB(r: ReportResult): r is HorizontalTankResult {
  return 'dryHead' in r && 'wetHead' in r
}
function isVerticalTankResultB(r: ReportResult): r is CalculationResult {
  return 'roof' in r && 'floor' in r
}

// ─── Document ───────────────────────────────────────────────────────────────

export function CalculationReport({
  input,
  result,
  metadata,
  revisions,
}: CalculationReportProps) {
  const mode = detectMode(input, result)

  const modeLabel = mode === 'pipe'
    ? 'Pipe / duct heat-loss calculation'
    : mode === 'horizontal'
      ? 'Horizontal tank heat-loss calculation'
      : 'Vertical storage tank heat-loss calculation'

  const tag = present(valueOf(input, 'tag'))

  // Guard: show placeholder if result is missing
  if (!result) {
    return (
      <Document title="Heat Transfer Calculation Report">
        <Page size="A4" style={S.page}>
          <View style={S.pageOuterFrame} fixed />
          <View style={S.disclaimerWrap} fixed>
            <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
          </View>
          <View style={S.outerBorder}>
            <View style={S.topHeader}>
              <Text style={S.topHeaderTitle}>Heat Transfer Calculation Report</Text>
              <Text style={S.topHeaderCode}>{DOCUMENT_CODE}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, color: MUTED }}>No calculation result available</Text>
              <Text style={{ fontSize: 8, color: MUTED, marginTop: 6 }}>Run the calculation first to generate the report</Text>
            </View>
          </View>
        </Page>
      </Document>
    )
  }

  return (
    <Document title={`Heat Transfer Calculation Report — ${tag}`}>
      <Page size="A4" style={S.page}>
        <View style={S.pageOuterFrame} fixed />
        <View style={S.disclaimerWrap} fixed>
          <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
        </View>

        <View style={S.outerBorder}>
          {/* ── Top header bar ── */}
          <View style={S.topHeader}>
            <Text style={S.topHeaderTitle}>Heat Transfer Calculation Report</Text>
            <Text style={S.topHeaderCode}>{DOCUMENT_CODE}</Text>
          </View>

          {/* ── Type row ── */}
          <View style={S.typeRow}>
            <View style={S.typeLabel}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: GUIDE }}>TYPE</Text>
            </View>
            <View style={S.typeValue}>
              <Text>{modeLabel} · Tag: {tag}</Text>
            </View>
          </View>

          <View style={S.bodyRow}>
            <View style={S.leftCol}>
              <Section title="I. GEOMETRY">
                {mode === 'pipe' && (
                  <>
                    <DataRow label="Pipe / duct type" value={present(valueOf(input, 'pipeType'))} />
                    <DataRow label="Orientation" value={present(valueOf(input, 'pipeOrientation'))} />
                    <DataRow label="Pipe length" value={fmt(valueOf(input, 'pipeLength') as number, 2)} unit="m" />
                    <DataRow label="Inside diameter" value={fmt(valueOf(input, 'insideDiameter') as number, 2)} unit="mm" />
                    <DataRow label="Outside diameter" value={fmt(valueOf(input, 'outsideDiameter') as number, 2)} unit="mm" />
                    <DataRow label="Side A" value={fmt(valueOf(input, 'sideA') as number, 2)} unit="mm" />
                    <DataRow label="Side B" value={fmt(valueOf(input, 'sideB') as number, 2)} unit="mm" />
                  </>
                )}
                {mode === 'vertical' && (
                  <>
                    <DataRow label="Tank diameter" value={fmt(valueOf(input, 'tankDiameter') as number, 2)} unit="mm" />
                    <DataRow label="Tank height" value={fmt(valueOf(input, 'tankHeight') as number, 2)} unit="mm" />
                    <DataRow label="Roof type" value={present(valueOf(input, 'tankRoofType'))} />
                    <DataRow label="Roof height" value={fmt(valueOf(input, 'roofHeight') as number, 2)} unit="mm" />
                    <DataRow label="Liquid level" value={fmt(valueOf(input, 'liquidLevel') as number, 2)} unit="mm" />
                    <DataRow label="Wall thickness" value={fmt(valueOf(input, 'wallThickness') as number, 2)} unit="mm" />
                    <DataRow label="Insulation thickness" value={fmt(valueOf(input, 'insulationThickness') as number, 2)} unit="mm" />
                  </>
                )}
                {mode === 'horizontal' && (
                  <>
                    <DataRow label="Tank diameter" value={fmt(valueOf(input, 'insideDiameter') as number, 2)} unit="mm" />
                    <DataRow label="Tank length" value={fmt(valueOf(input, 'tankLength') as number, 2)} unit="mm" />
                    <DataRow label="Head type" value={present(valueOf(input, 'headType'))} />
                    <DataRow label="Head depth" value={fmt(valueOf(input, 'headDepth') as number, 2)} unit="mm" />
                    <DataRow label="Flange width" value={fmt(valueOf(input, 'flangeWidth') as number, 2)} unit="mm" />
                    <DataRow label="Liquid level" value={fmt(valueOf(input, 'liquidLevel') as number, 2)} unit="mm" />
                    <DataRow label="Wall thickness" value={fmt(valueOf(input, 'wallThickness') as number, 2)} unit="mm" />
                    <DataRow label="Insulation thickness" value={fmt(valueOf(input, 'insulationThickness') as number, 2)} unit="mm" />
                  </>
                )}
              </Section>

              <Section title="II. OPERATING CONDITIONS">
                {mode === 'pipe' && (
                  <>
                    <DataRow label="Flow rate" value={fmt(valueOf(input, 'flowRate') as number, 2)} unit="kg/h" />
                    <DataRow label="Inlet temperature" value={fmt(valueOf(input, 'inletTemp') as number, 2)} unit="°C" />
                    <DataRow label="Ambient temperature" value={fmt(valueOf(input, 'ambientTemp') as number, 2)} unit="°C" />
                    <DataRow label="Wind speed" value={fmt(valueOf(input, 'windSpeed') as number, 2)} unit="m/s" />
                    <DataRow label="Pressure" value={fmt(valueOf(input, 'pressure') as number, 2)} unit="barg" />
                  </>
                )}
                {(mode === 'vertical' || mode === 'horizontal') && (
                  <>
                    <DataRow label="Fluid temperature" value={fmt(valueOf(input, 'fluidTemp') as number, 2)} unit="°C" />
                    <DataRow label="Vapor temperature" value={fmt(valueOf(input, 'vaporTemp') as number, 2)} unit="°C" />
                    <DataRow label="Ambient temperature" value={fmt(valueOf(input, 'ambientTemp') as number, 2)} unit="°C" />
                    <DataRow label="Wind speed" value={fmt(valueOf(input, 'windSpeed') as number, 2)} unit="m/s" />
                    {mode === 'horizontal' && (
                      <DataRow label="Ground temperature" value={fmt(valueOf(input, 'groundTemp') as number, 2)} unit="°C" />
                    )}
                  </>
                )}
              </Section>

              <Section title="IV. CALCULATION RESULTS">
                {result.status === 'error' ? (
                  <DataRow label="Status" value="Calculation failed — check inputs" />
                ) : isPipeResultB(result) ? (
                  <>
                    <DataRow label="Q heat loss" value={fmt(result.heatLoss, 2)} unit="W" highlight />
                    <DataRow label="Outlet temperature" value={fmt(result.outletTemp, 2)} unit="°C" highlight />
                    <DataRow label="U overall" value={fmt(result.uOverall, 3)} unit="W/m²·K" highlight />
                    <DataRow label="Surface area" value={fmt(result.surfaceArea, 3)} unit="m²" />
                    <DataRow label="Re_internal" value={fmt(result.reynoldsInternal, 0)} />
                    <DataRow label="h_internal" value={fmt(result.internalHTC, 3)} unit="W/m²·K" />
                    <DataRow label="h_external" value={fmt(result.externalHTC, 3)} unit="W/m²·K" />
                    <DataRow label="Radiation HTC" value={fmt(result.radiationHTC, 3)} unit="W/m²·K" />
                    <DataRow label="T_wall in / out" value={`${fmt(result.twInside, 2)} / ${fmt(result.twOutside, 2)}`} unit="°C" />
                  </>
                ) : isHorizontalTankResultB(result) ? (
                  <>
                    <DataRow label="Total heat loss" value={fmt(result.totalHeatLoss, 2)} unit="W" highlight />
                    <DataRow label="Total area" value={fmt(result.totalArea, 3)} unit="m²" />
                    <DataRow label="Dry Wall U" value={fmt(result.dryWall.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Wet Wall U" value={fmt(result.wetWall.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Dry Head U" value={fmt(result.dryHead.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Wet Head U" value={fmt(result.wetHead.uOverall, 4)} unit="W/m²·K" />
                  </>
                ) : (
                  <>
                    <DataRow label="Total heat loss" value={fmt(result.totalHeatLoss, 2)} unit="W" highlight />
                    <DataRow label="Total area" value={fmt(result.totalArea, 3)} unit="m²" />
                    <DataRow label="Dry Wall U" value={fmt(result.dryWall.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Wet Wall U" value={fmt(result.wetWall.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Roof U" value={fmt(result.roof.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Floor U" value={fmt(result.floor.uOverall, 4)} unit="W/m²·K" />
                  </>
                )}
              </Section>
            </View>

            <View style={S.rightCol}>
              <Section title="III. CONSTRUCTION & FLUID PROPERTIES">

                {mode === 'pipe' && (
                  <>
                    <DataRow label="Wall conductivity" value={fmt(valueOf(input, 'wallConductivity') as number, 3)} unit="W/m·K" />
                    <DataRow label="Insulation conductivity" value={fmt(valueOf(input, 'insulationConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fluid density" value={fmt(valueOf(input, 'fluidDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Fluid specific heat" value={fmt(valueOf(input, 'fluidSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Fluid viscosity" value={fmt(valueOf(input, 'fluidViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Fluid thermal conductivity" value={fmt(valueOf(input, 'fluidThermalConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Surface emissivity" value={fmt(valueOf(input, 'surfaceEmissivity') as number, 3)} />
                    <DataRow label="Wind enhancement" value={fmt(valueOf(input, 'windEnhancement') as number, 3)} />
                  </>
                )}
                {mode === 'vertical' && (
                  <>
                    <DataRow label="Wall conductivity" value={fmt(valueOf(input, 'wallConductivity') as number, 3)} unit="W/m·K" />
                    <DataRow label="Insulation conductivity" value={fmt(valueOf(input, 'insulationConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fluid density" value={fmt(valueOf(input, 'fluidDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Fluid specific heat" value={fmt(valueOf(input, 'fluidSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Fluid viscosity" value={fmt(valueOf(input, 'fluidViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Fluid thermal conductivity" value={fmt(valueOf(input, 'fluidThermalConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fluid expansion coeff." value={fmt(valueOf(input, 'fluidExpansionCoeff') as number, 6)} unit="1/K" />
                    <DataRow label="Vapor density" value={fmt(valueOf(input, 'vaporDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Vapor specific heat" value={fmt(valueOf(input, 'vaporSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Vapor viscosity" value={fmt(valueOf(input, 'vaporViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Vapor thermal conductivity" value={fmt(valueOf(input, 'vaporThermalConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fouling dry wall" value={fmt(valueOf(input, 'foulingDryWall') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling wet wall" value={fmt(valueOf(input, 'foulingWetWall') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling roof" value={fmt(valueOf(input, 'foulingRoof') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling floor" value={fmt(valueOf(input, 'foulingFloor') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Surface emissivity" value={fmt(valueOf(input, 'surfaceEmissivity') as number, 3)} />
                    <DataRow label="Roof emissivity" value={fmt(valueOf(input, 'roofEmissivity') as number, 3)} />
                    <DataRow label="Wind enhancement" value={fmt(valueOf(input, 'windEnhancement') as number, 3)} />
                  </>
                )}
                {mode === 'horizontal' && (
                  <>
                    <DataRow label="Wall conductivity" value={fmt(valueOf(input, 'wallConductivity') as number, 3)} unit="W/m·K" />
                    <DataRow label="Insulation conductivity" value={fmt(valueOf(input, 'insulationConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fluid density" value={fmt(valueOf(input, 'fluidDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Fluid specific heat" value={fmt(valueOf(input, 'fluidSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Fluid viscosity" value={fmt(valueOf(input, 'fluidViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Fluid thermal conductivity" value={fmt(valueOf(input, 'fluidThermalConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fluid expansion coeff." value={fmt(valueOf(input, 'fluidExpansionCoeff') as number, 6)} unit="1/K" />
                    <DataRow label="Vapor density" value={fmt(valueOf(input, 'vaporDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Vapor specific heat" value={fmt(valueOf(input, 'vaporSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Vapor viscosity" value={fmt(valueOf(input, 'vaporViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Vapor thermal conductivity" value={fmt(valueOf(input, 'vaporThermalConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fouling dry wall" value={fmt(valueOf(input, 'foulingDryWall') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling wet wall" value={fmt(valueOf(input, 'foulingWetWall') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling dry head" value={fmt(valueOf(input, 'foulingDryHead') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling wet head" value={fmt(valueOf(input, 'foulingWetHead') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Surface emissivity" value={fmt(valueOf(input, 'surfaceEmissivity') as number, 3)} />
                    <DataRow label="Wind enhancement" value={fmt(valueOf(input, 'windEnhancement') as number, 3)} />
                  </>
                )}
              </Section>
            </View>
          </View>

          <View style={S.sketchSection}>
            <View style={S.sketchHeader}>
              <Text style={S.sketchHeaderText}>SKETCH</Text>
            </View>
            <View style={S.sketchBody}>
              <PdfSchematic input={input} mode={mode} />
            </View>
            <Text style={S.sketchCaption}>
              {mode === 'pipe'
                ? 'Pipe / duct cross-section with insulation layers'
                : mode === 'horizontal'
                  ? 'Horizontal tank dry/wet surface zones'
                  : 'Vertical tank dry/wet surface zones'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 4, columnGap: 8, rowGap: 3 }}>
              {[
                { color: PDF_LIQUID, label: 'LIQUID / WET' },
                { color: PDF_DRY, label: 'DRY WALL' },
                { color: PDF_INSUL, label: 'INSULATION' },
                { color: PDF_METAL, label: 'METAL' },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Rect x={0} y={0} width={7} height={7} fill={item.color} />
                  <Text style={{ fontSize: 5.5, color: GUIDE, marginLeft: 3 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <TitleBlock metadata={metadata} revisions={revisions} />
        </View>
      </Page>
    </Document>
  )
}
