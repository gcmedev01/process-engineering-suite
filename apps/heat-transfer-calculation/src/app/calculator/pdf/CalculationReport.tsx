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
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Page,
  Path,
  Polygon,
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
  const titleInfoHeight = 42

  const trS = {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    flex: 1,
    borderBottomWidth: BW,
    borderBottomColor: BLACK,
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
      <View style={{ flexDirection: 'row', height: titleInfoHeight, borderBottomWidth: HB, borderBottomColor: BLACK }}>
        <View style={{ flex: 3, height: titleInfoHeight, borderRightWidth: HB, borderRightColor: BLACK }}>
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

const PDF_FOREGROUND = '#111827'
const PDF_GUIDE    = '#6b7280'
const PDF_SKY      = '#0ea5e9'
const PDF_AMBER    = '#f59e0b'
const PDF_ORANGE   = '#fb923c'
const PDF_METAL    = '#94a3b8'
const HEAT_SCHEMATIC_SIZE = 420
const HEAT_SCHEMATIC_PADDING = 34
const PDF_SCHEMATIC_RENDER_SIZE = 340

function PdfSchematic({ input, mode }: { input: ReportInput; mode: ReportMode }) {
  const raw = mode === 'pipe'
    ? buildPipeSchematic(input as PipeCalculationInput, HEAT_SCHEMATIC_SIZE, HEAT_SCHEMATIC_SIZE, HEAT_SCHEMATIC_PADDING)
    : mode === 'horizontal'
      ? buildHorizontalTankSchematic(input as HorizontalTankInput, HEAT_SCHEMATIC_SIZE, HEAT_SCHEMATIC_SIZE, HEAT_SCHEMATIC_PADDING)
      : buildVerticalTankSchematic(input as CalculationInput, HEAT_SCHEMATIC_SIZE, HEAT_SCHEMATIC_SIZE, HEAT_SCHEMATIC_PADDING)

  if (!raw) return null

  const model = raw
  const clipPathUrl = model.clipPath ? `url(#${model.clipPath.id}-pdf)` : undefined

  return (
    <Svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      style={{ width: PDF_SCHEMATIC_RENDER_SIZE, height: PDF_SCHEMATIC_RENDER_SIZE }}
    >
      <Defs>
        {model.clipPath && (
          <ClipPath id={`${model.clipPath.id}-pdf`}>
            {model.clipPath.path && <Path d={model.clipPath.path} />}
            {model.clipPath.rect && (
              <Rect
                x={model.clipPath.rect.x}
                y={model.clipPath.rect.y}
                width={model.clipPath.rect.width}
                height={model.clipPath.rect.height}
                rx={model.clipPath.rect.rx}
                ry={model.clipPath.rect.ry}
              />
            )}
          </ClipPath>
        )}
      </Defs>

      <Rect
        x={1}
        y={1}
        width={model.width - 2}
        height={model.height - 2}
        rx={16}
        fill="none"
        stroke={PDF_FOREGROUND}
        strokeWidth={1}
        opacity={0.1}
      />

      {/* Zone fills mirror the web SVG order and clipping behavior. */}
      {model.zoneFills.paths.map((p) => (
        <Path key={p.key} d={p.d} fill={fillColor(p.tone)} opacity={p.opacity ?? 1} clipPath={clipPathUrl} />
      ))}
      {model.zoneFills.rects.map((r) => (
        <Rect key={r.key} x={r.x} y={r.y} width={r.width} height={r.height}
          rx={r.rx} ry={r.ry} fill={fillColor(r.tone)} opacity={r.opacity ?? 1} clipPath={clipPathUrl} />
      ))}
      {model.zoneFills.ellipses.map((e) => (
        <Ellipse key={e.key} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry}
          fill={fillColor(e.tone)} opacity={e.opacity ?? 1} clipPath={clipPathUrl} />
      ))}
      {model.zoneFills.circles.map((c) => (
        <Circle key={c.key} cx={c.cx} cy={c.cy} r={c.r}
          fill={fillColor(c.tone)} opacity={c.opacity ?? 1} clipPath={clipPathUrl} />
      ))}
      {model.liquidFill && (
        <Rect
          x={model.liquidFill.x}
          y={model.liquidFill.y}
          width={model.liquidFill.width}
          height={model.liquidFill.height}
          rx={model.liquidFill.rx}
          ry={model.liquidFill.ry}
          fill={fillColor(model.liquidFill.tone)}
          opacity={model.liquidFill.opacity ?? 1}
          clipPath={clipPathUrl}
        />
      )}

      {/* Guide lines */}
      {model.guideLines.map((g) => (
        <Line key={g.key} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
          stroke={PDF_GUIDE} strokeWidth={1.2} opacity={g.opacity ?? 0.6} />
      ))}

      {/* Outlines */}
      {model.outlines.rects.map((r) => (
        <Rect key={r.key} x={r.x} y={r.y} width={r.width} height={r.height}
          rx={r.rx} ry={r.ry} stroke={PDF_FOREGROUND} strokeWidth={2} fill="none" opacity={0.85} />
      ))}
      {model.outlines.circles.map((c) => (
        <Circle key={c.key} cx={c.cx} cy={c.cy} r={c.r}
          stroke={PDF_FOREGROUND} strokeWidth={2} fill="none" opacity={0.85} />
      ))}
      {model.outlines.ellipses.map((e) => (
        <Ellipse key={e.key} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry}
          stroke={PDF_FOREGROUND} strokeWidth={2} fill="none" opacity={0.85} />
      ))}
      {model.outlines.paths.map((p) => (
        <Path key={p.key} d={p.d} stroke={PDF_FOREGROUND} strokeWidth={2} fill="none" opacity={0.85} />
      ))}
      {model.outlines.lines.map((l) => (
        <G key={l.key}>
          <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={PDF_FOREGROUND} strokeWidth={l.strokeWidth ?? 1.2}
            strokeDasharray={l.dashed} opacity={l.opacity ?? 0.85} />
          {l.key.includes('arrow') && <ArrowHead x={l.x2} y={l.y2} fromX={l.x1} fromY={l.y1} color={PDF_FOREGROUND} />}
        </G>
      ))}

      {/* Levels */}
      {model.levels.map((lv) => (
        <G key={lv.key}>
          <Line x1={lv.x0} y1={lv.y} x2={lv.x1} y2={lv.y}
            stroke={lv.color} strokeWidth={2} strokeDasharray={lv.dashed ? '5 4' : undefined} />
          <Text x={lv.x1 + (lv.labelOffset ?? 18)} y={lv.y - 4} fill={lv.color} style={{ fontSize: 11 }}>
            {lv.label}
          </Text>
        </G>
      ))}

      {/* Annotations */}
      {model.annotations.map((ann) => {
        const mx = (ann.x1 + ann.x2) / 2
        const my = (ann.y1 + ann.y2) / 2
        const verticalLabelX = mx + (ann.labelSide === 'end' ? 13 : -13)
        return (
          <G key={ann.key}>
            <Line x1={ann.x1} y1={ann.y1} x2={ann.x2} y2={ann.y2}
              stroke={PDF_GUIDE} strokeWidth={1.2} />
            <ArrowHead x={ann.x1} y={ann.y1} fromX={ann.x2} fromY={ann.y2} color={PDF_GUIDE} />
            <ArrowHead x={ann.x2} y={ann.y2} fromX={ann.x1} fromY={ann.y1} color={PDF_GUIDE} />
            {ann.vertical ? (
              <Text
                x={verticalLabelX}
                y={my + 3}
                fill={PDF_GUIDE}
                style={{ fontSize: 11 }}
                textAnchor={ann.labelSide === 'end' ? 'start' : 'end'}
              >
                {ann.label}
              </Text>
            ) : (
              <Text x={mx} y={my - 6} fill={PDF_GUIDE} style={{ fontSize: 11 }} textAnchor="middle">
                {ann.label}
              </Text>
            )}
          </G>
        )
      })}

      {/* Labels */}
      {model.labels.map((lb) => (
        <Text key={lb.key} x={lb.x} y={lb.y}
          textAnchor={lb.anchor ?? 'middle'}
          style={{ fontSize: lb.size ?? 12 }}
          fill={labelColor(lb.tone)}>
          {lb.text}
        </Text>
      ))}

      <Text x={model.width / 2} y={22} textAnchor="middle" fill={PDF_GUIDE} style={{ fontSize: 12 }}>
        {model.subtitle}
      </Text>
    </Svg>
  )
}

function fillColor(tone?: string): string {
  switch (tone) {
    case 'liquid':
    case 'wet':       return PDF_SKY
    case 'dry':       return PDF_AMBER
    case 'insulation': return PDF_ORANGE
    case 'metal':     return PDF_METAL
    default:          return '#cbd5e1'
  }
}

function labelColor(tone?: string): string {
  switch (tone) {
    case 'liquid':
    case 'wet':       return '#0284c7'
    case 'dry':       return '#b45309'
    case 'insulation': return '#c2410c'
    case 'metal':     return '#475569'
    default:          return PDF_GUIDE
  }
}

function ArrowHead({
  x,
  y,
  fromX,
  fromY,
  color,
}: {
  x: number
  y: number
  fromX: number
  fromY: number
  color: string
}) {
  const angle = Math.atan2(y - fromY, x - fromX)
  const size = 5
  const wing = Math.PI / 7
  const p1x = x - size * Math.cos(angle - wing)
  const p1y = y - size * Math.sin(angle - wing)
  const p2x = x - size * Math.cos(angle + wing)
  const p2y = y - size * Math.sin(angle + wing)

  return <Polygon points={`${x},${y} ${p1x},${p1y} ${p2x},${p2y}`} fill={color} />
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
  const rawDescription = valueOf(input, 'description')
  const description = typeof rawDescription === 'string' ? rawDescription.trim() : ''

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
              <Text>{modeLabel} · Tag: {tag}{description ? ` · Description: ${description}` : ''}</Text>
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
                    <DataRow label="Ambient temperature" value={fmt(valueOf(input, 'ambientTemp') as number, 2)} unit="°C" />
                    <DataRow label="Wind speed" value={fmt(valueOf(input, 'windSpeed') as number, 2)} unit="m/s" />
                    <DataRow label="Wind enhancement" value={fmt(valueOf(input, 'windEnhancement') as number, 3)} unit="—" />
                  </>
                )}
              </Section>

              <Section title="CALCULATION RESULTS">
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
                    <DataRow label="Cooling Rate" value={fmt(result.cooling.rateCHr, 4)} unit="°C/hr" highlight />
                    <DataRow label="Total area" value={fmt(result.totalArea, 3)} unit="m²" />
                    <DataRow label="Dry Wall U" value={fmt(result.dryWall.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Wet Wall U" value={fmt(result.wetWall.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Dry Head U" value={fmt(result.dryHead.uOverall, 4)} unit="W/m²·K" />
                    <DataRow label="Wet Head U" value={fmt(result.wetHead.uOverall, 4)} unit="W/m²·K" />
                  </>
                ) : (
                  <>
                    <DataRow label="Total heat loss" value={fmt(result.totalHeatLoss, 2)} unit="W" highlight />
                    <DataRow label="Cooling Rate" value={fmt(result.cooling.rateCHr, 4)} unit="°C/hr" highlight />
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
              {mode === 'pipe' && (
                <>
                  <Section title="FLUID PROPERTIES">
                    <DataRow label="Fluid density" value={fmt(valueOf(input, 'fluidDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Fluid specific heat" value={fmt(valueOf(input, 'fluidSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Fluid viscosity" value={fmt(valueOf(input, 'fluidViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Fluid thermal conductivity" value={fmt(valueOf(input, 'fluidThermalConductivity') as number, 4)} unit="W/m·K" />
                  </Section>
                  <Section title="WALL & INSULATION">
                    <DataRow label="Wall thickness" value={fmt(valueOf(input, 'wallThickness') as number, 2)} unit="mm" />
                    <DataRow label="Wall conductivity" value={fmt(valueOf(input, 'wallConductivity') as number, 3)} unit="W/m·K" />
                    <DataRow label="Insulation thickness" value={fmt(valueOf(input, 'insulationThickness') as number, 2)} unit="mm" />
                    <DataRow label="Insulation conductivity" value={fmt(valueOf(input, 'insulationConductivity') as number, 4)} unit="W/m·K" />
                  </Section>
                  <Section title="SURFACE PROPERTIES">
                    <DataRow label="Surface emissivity" value={fmt(valueOf(input, 'surfaceEmissivity') as number, 3)} />
                  </Section>
                </>
              )}
              {mode === 'vertical' && (
                <>
                  <Section title="WALL CONSTRUCTION">
                    <DataRow label="Wall thickness" value={fmt(valueOf(input, 'wallThickness') as number, 2)} unit="mm" />
                    <DataRow label="Wall conductivity" value={fmt(valueOf(input, 'wallConductivity') as number, 3)} unit="W/m·K" />
                    <DataRow label="Insulation thickness" value={fmt(valueOf(input, 'insulationThickness') as number, 2)} unit="mm" />
                    <DataRow label="Insulation conductivity" value={fmt(valueOf(input, 'insulationConductivity') as number, 4)} unit="W/m·K" />
                  </Section>
                  <Section title="FLUID PROPERTIES">
                    <DataRow label="Fluid density" value={fmt(valueOf(input, 'fluidDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Fluid specific heat" value={fmt(valueOf(input, 'fluidSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Fluid viscosity" value={fmt(valueOf(input, 'fluidViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Fluid thermal conductivity" value={fmt(valueOf(input, 'fluidThermalConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fluid expansion coeff." value={fmt(valueOf(input, 'fluidExpansionCoeff') as number, 6)} unit="1/K" />
                  </Section>
                  <Section title="VAPOR/GAS PROPERTIES">
                    <DataRow label="Vapor density" value={fmt(valueOf(input, 'vaporDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Vapor specific heat" value={fmt(valueOf(input, 'vaporSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Vapor viscosity" value={fmt(valueOf(input, 'vaporViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Vapor thermal conductivity" value={fmt(valueOf(input, 'vaporThermalConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Vapor expansion coeff." value={fmt(valueOf(input, 'vaporExpansionCoeff') as number, 6)} unit="1/K" />
                  </Section>
                  <Section title="SURFACE PROPERTIES">
                    <DataRow label="Wall emissivity" value={fmt(valueOf(input, 'surfaceEmissivity') as number, 3)} />
                    <DataRow label="Roof emissivity" value={fmt(valueOf(input, 'roofEmissivity') as number, 3)} />
                  </Section>
                  <Section title="FOULING & GROUND">
                    <DataRow label="Fouling dry wall" value={fmt(valueOf(input, 'foulingDryWall') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling wet wall" value={fmt(valueOf(input, 'foulingWetWall') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling roof" value={fmt(valueOf(input, 'foulingRoof') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Fouling floor" value={fmt(valueOf(input, 'foulingFloor') as number, 3)} unit="W/m²·K" />
                    <DataRow label="Ground temperature" value={fmt(valueOf(input, 'groundTemp') as number, 2)} unit="°C" />
                    <DataRow label="Ground conductivity" value={fmt(valueOf(input, 'groundConductivity') as number, 4)} unit="W/m·K" />
                  </Section>
                </>
              )}
              {mode === 'horizontal' && (
                <>
                  <Section title="WALL & INSULATION">
                    <DataRow label="Wall thickness" value={fmt(valueOf(input, 'wallThickness') as number, 2)} unit="mm" />
                    <DataRow label="Wall conductivity" value={fmt(valueOf(input, 'wallConductivity') as number, 3)} unit="W/m·K" />
                    <DataRow label="Insulation thickness" value={fmt(valueOf(input, 'insulationThickness') as number, 2)} unit="mm" />
                    <DataRow label="Insulation conductivity" value={fmt(valueOf(input, 'insulationConductivity') as number, 4)} unit="W/m·K" />
                  </Section>
                  <Section title="FLUID PROPERTIES">
                    <DataRow label="Fluid density" value={fmt(valueOf(input, 'fluidDensity') as number, 2)} unit="kg/m³" />
                    <DataRow label="Fluid specific heat" value={fmt(valueOf(input, 'fluidSpecificHeat') as number, 2)} unit="J/kg·K" />
                    <DataRow label="Fluid viscosity" value={fmt(valueOf(input, 'fluidViscosity') as number, 6)} unit="Pa·s" />
                    <DataRow label="Fluid thermal conductivity" value={fmt(valueOf(input, 'fluidThermalConductivity') as number, 4)} unit="W/m·K" />
                    <DataRow label="Fluid expansion coeff." value={fmt(valueOf(input, 'fluidExpansionCoeff') as number, 6)} unit="1/K" />
                  </Section>
                  <Section title="SURFACE & GROUND">
                    <DataRow label="Emissivity" value={fmt(valueOf(input, 'surfaceEmissivity') as number, 3)} />
                    <DataRow label="Ground temperature" value={fmt(valueOf(input, 'groundTemp') as number, 2)} unit="°C" />
                    <DataRow label="Ground conductivity" value={fmt(valueOf(input, 'groundConductivity') as number, 4)} unit="W/m·K" />
                  </Section>
                </>
              )}
            </View>
          </View>

          <View style={S.sketchSection}>
            <View style={S.sketchHeader}>
              <Text style={S.sketchHeaderText}>SKETCH</Text>
            </View>
            <View style={S.sketchBody}>
              <PdfSchematic input={input} mode={mode} />
            </View>
          </View>

          <TitleBlock metadata={metadata} revisions={revisions} />
        </View>
      </Page>
    </Document>
  )
}
