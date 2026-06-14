/**
 * VesselReport — @react-pdf/renderer document.
 * Replicates CA-PR-1050.0101 single-page engineering calculation form.
 */

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Line,
  Circle,
  Polygon,
  G,
  Defs,
  ClipPath,
} from '@react-pdf/renderer'
import { convertUnit } from '@eng-suite/physics'
import { BASE_UNITS, UOM_LABEL, type VesselUomCategory } from '@/lib/uom'
import {
  buildTankSchematicModel,
  type TankSchematicAnnotation,
  type TankSchematicLevel,
} from '@/lib/schematics/tankSchematicModel'
import {
  buildVesselSchematicModel,
  type VesselSchematicAnnotation,
  type VesselSchematicLevel,
} from '@/lib/schematics/vesselSchematicModel'
import {
  EquipmentMode,
  HeadType,
  TankRoofType,
  TankType,
  VesselOrientation,
  type CalculationInput,
  type CalculationResult,
  type CalculationMetadata,
  type RevisionRecord,
} from '@/types'

// ─── Public interface ────────────────────────────────────────────────────────

export interface CalculationReportProps {
  input: CalculationInput
  result: CalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
  units: Record<VesselUomCategory, string>
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const NAVY     = '#1f3864'
const VALUE_BG = '#dbeafe'
const WHITE    = '#ffffff'
const BLACK    = '#000000'
const GUIDE    = '#374151'
const MUTED    = '#6b7280'
const BW       = 0.5   // light row border
const HB       = 1     // heavy section border
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
    marginTop: 8,
    marginRight: 8,
    marginBottom: 8,
    marginLeft: 18,
    borderWidth: HB,
    borderColor: BLACK,
    flex: 1,
    flexDirection: 'column',
  },
  // ── Section header
  secHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  secHeaderText: {
    color: WHITE,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Data row
  row: {
    flexDirection: 'row',
    borderBottomWidth: BW,
    borderBottomColor: '#e5e7eb',
    minHeight: 12,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rowLabel: {
    flex: 3.5,
    fontSize: 7,
    color: GUIDE,
  },
  rowValueBox: {
    flex: 2,
    borderWidth: BW,
    borderColor: '#93c5fd',
    minHeight: 9,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  rowValueText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  rowUnit: {
    flex: 1.2,
    fontSize: 7,
    color: MUTED,
    textAlign: 'right',
    paddingLeft: 2,
  },
  // ── Title block revision cells
  revHead: {
    flex: 1,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: GUIDE,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRightWidth: BW,
    borderRightColor: BLACK,
    backgroundColor: '#f3f4f6',
  },
  revCell: {
    flex: 1,
    fontSize: 6,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRightWidth: BW,
    borderRightColor: BLACK,
  },
  // ── Legend
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
    columnGap: 12,
    rowGap: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendLabel: { fontSize: 6.5, color: MUTED, marginLeft: 3 },
  // ── Footer
  footer: {
    position: 'absolute',
    bottom: 6,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: BW,
    borderTopColor: '#d1d5db',
    paddingTop: 3,
  },
  footerText: { fontSize: 6, color: MUTED },
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

function fmt(
  value: number | null | undefined,
  baseUnit: string,
  displayUnit: string,
  decimals = 4,
): string {
  if (value == null || !isFinite(value)) return '—'
  const converted = convertUnit(value, baseUnit, displayUnit)
  if (!isFinite(converted)) return '—'
  return converted.toFixed(decimals)
}

function ul(unit: string): string {
  return UOM_LABEL[unit] ?? unit
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

// ─── Primitive components ────────────────────────────────────────────────────

function SecHeader({ prefix, title }: { prefix: string; title: string }) {
  return (
    <View style={S.secHeader}>
      <Text style={S.secHeaderText}>{prefix}  {title}</Text>
    </View>
  )
}

/** Standard label | value box | unit row */
function DR({
  label,
  value,
  unit,
  hi,       // highlight value box even when empty (enum fields)
  ind,      // indent label
}: {
  label: string
  value?: string | null
  unit?: string
  hi?: boolean
  ind?: boolean
}) {
  const filled = (value != null && value !== '' && value !== '—') || hi
  return (
    <View style={S.row}>
      <Text style={ind ? [S.rowLabel, { paddingLeft: 10 }] : S.rowLabel}>{label}</Text>
      <View style={[S.rowValueBox, { backgroundColor: filled ? VALUE_BG : WHITE }]}>
        <Text style={S.rowValueText}>{value ?? ''}</Text>
      </View>
      <Text style={S.rowUnit}>{unit ?? ''}</Text>
    </View>
  )
}

/** Special two-value row: Partial Volume at level */
function PartialVolumeRow({
  level, lUnit, volume, vUnit,
}: {
  level?: string | null; lUnit: string; volume?: string | null; vUnit: string
}) {
  return (
    <View style={S.row}>
      <Text style={[S.rowLabel, { flex: 2.2 }]}>Partial Volume at level</Text>
      <View style={[S.rowValueBox, { flex: 1.3, backgroundColor: level && level !== '—' ? VALUE_BG : WHITE }]}>
        <Text style={S.rowValueText}>{level ?? ''}</Text>
      </View>
      <Text style={[S.rowUnit, { flex: 0.7 }]}>{lUnit}</Text>
      <View style={[S.rowValueBox, { flex: 1.5, backgroundColor: volume && volume !== '—' ? VALUE_BG : WHITE }]}>
        <Text style={S.rowValueText}>{volume ?? ''}</Text>
      </View>
      <Text style={[S.rowUnit, { flex: 0.7 }]}>{vUnit}</Text>
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

      {/* Row 1: TITLE/PROJECT/CLIENT (left) | revision columns (right) */}
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
                <Text style={{ fontSize: 6, textAlign: 'center' }}>{rev ? [rev.by, rev.byDate].filter(Boolean).join('  ') : ''}</Text>
              </View>
              <View style={revDataCellS}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>{rev ? [rev.checkedBy, rev.checkedDate].filter(Boolean).join('  ') : ''}</Text>
              </View>
              <View style={{ ...revDataCellS, borderRightWidth: 0 }}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>{rev ? [rev.approvedBy, rev.approvedDate].filter(Boolean).join('  ') : ''}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Row 2: logo + company | project / doc / page / of */}
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
            <Text style={{ fontSize: 5, color: MUTED, fontFamily: 'Helvetica-Bold' }}>PROJECT NO.</Text>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>{metadata.projectNumber || ''}</Text>
          </View>
          <View style={{ flex: 1.5, paddingHorizontal: 3, paddingVertical: 2, borderRightWidth: BW, borderRightColor: BLACK }}>
            <Text style={{ fontSize: 5, color: MUTED, fontFamily: 'Helvetica-Bold' }}>DOCUMENT NO.</Text>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>{metadata.documentNumber || ''}</Text>
          </View>
          <View style={{ flex: 0.7, paddingHorizontal: 3, paddingVertical: 2, borderRightWidth: BW, borderRightColor: BLACK }}>
            <Text style={{ fontSize: 5, color: MUTED, fontFamily: 'Helvetica-Bold' }}>PAGE NO.</Text>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }} render={({ pageNumber }) => String(pageNumber)} />
          </View>
          <View style={{ flex: 0.7, paddingHorizontal: 3, paddingVertical: 2 }}>
            <Text style={{ fontSize: 5, color: MUTED, fontFamily: 'Helvetica-Bold' }}>OF</Text>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }} render={({ totalPages }) => String(totalPages)} />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: NAVY, paddingHorizontal: 4, paddingVertical: 2 }}>
        <Text style={{ fontSize: 5.5, color: WHITE }}>CA-PR-1050-0101</Text>
        <Text style={{ fontSize: 5.5, color: WHITE }}>VALIDATION REPORT : RPT-PR-1050-0101</Text>
      </View>

    </View>
  )
}

// ─── Schematic legend swatches ────────────────────────────────────────────────

function LegendSwatch({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <View style={S.legendItem}>
      <View
        style={{
          width: 10,
          height: 10,
          backgroundColor: color,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 999,
        }}
      />
      <Text style={S.legendLabel}>{label.toUpperCase()}</Text>
    </View>
  )
}
function LegendOutline({ label, thick }: { label: string; thick?: boolean }) {
  return (
    <View style={S.legendItem}>
      <View
        style={{
          width: 10,
          height: 10,
          borderWidth: thick ? 2 : 1,
          borderColor: '#6b7280',
          borderRadius: 999,
        }}
      />
      <Text style={S.legendLabel}>{label.toUpperCase()}</Text>
    </View>
  )
}
function LegendDash({ color, label }: { color: string; label: string }) {
  return (
    <View style={S.legendItem}>
      <View style={{ width: 14, height: 0, borderTopWidth: 1.5, borderTopColor: color, borderStyle: 'dashed' }} />
      <Text style={S.legendLabel}>{label.toUpperCase()}</Text>
    </View>
  )
}

// ─── PDF level / annotation renderers ────────────────────────────────────────

function PdfArrowheads({
  x1,
  y1,
  x2,
  y2,
  color,
  size = 4,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  size?: number
}) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)

  if (!length) return null

  const ux = dx / length
  const uy = dy / length
  const px = -uy
  const py = ux
  const halfWidth = size * 0.6

  const startBaseX = x1 + ux * size
  const startBaseY = y1 + uy * size
  const endBaseX = x2 - ux * size
  const endBaseY = y2 - uy * size

  const startPoints = [
    `${x1},${y1}`,
    `${startBaseX + px * halfWidth},${startBaseY + py * halfWidth}`,
    `${startBaseX - px * halfWidth},${startBaseY - py * halfWidth}`,
  ].join(' ')

  const endPoints = [
    `${x2},${y2}`,
    `${endBaseX + px * halfWidth},${endBaseY + py * halfWidth}`,
    `${endBaseX - px * halfWidth},${endBaseY - py * halfWidth}`,
  ].join(' ')

  return (
    <>
      <Polygon points={startPoints} fill={color} />
      <Polygon points={endPoints} fill={color} />
    </>
  )
}

function PdfLevelLine({ level }: { level: VesselSchematicLevel }) {
  return (
    <G>
      <Line
        x1={level.lineX1} y1={level.y}
        x2={level.lineX2} y2={level.y}
        stroke={level.color}
        strokeWidth={1.5}
        strokeDasharray={level.dashed ? '4 2' : undefined}
      />
      <Text x={level.textX} y={level.textY} fill={level.color} style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>
        {level.label}
      </Text>
    </G>
  )
}

function PdfAnnotation({ annotation, color }: { annotation: VesselSchematicAnnotation; color: string }) {
  const cx = (annotation.x1 + annotation.x2) / 2
  const cy = (annotation.y1 + annotation.y2) / 2
  const textX = annotation.vertical
    ? cx + (annotation.labelSide === 'start' ? -8 : 8)
    : cx
  return (
    <G>
      <Line x1={annotation.x1} y1={annotation.y1} x2={annotation.x2} y2={annotation.y2} stroke={color} strokeWidth={1} />
      <PdfArrowheads x1={annotation.x1} y1={annotation.y1} x2={annotation.x2} y2={annotation.y2} color={color} />
      <Text
        x={textX}
        y={annotation.vertical ? cy + 3 : cy - 6}
        textAnchor={annotation.vertical ? (annotation.labelSide === 'start' ? 'end' : 'start') : 'middle'}
        fill={color}
        style={{ fontSize: 10 }}
      >
        {annotation.label}
      </Text>
    </G>
  )
}

function PdfTankLevelLine({ level }: { level: TankSchematicLevel }) {
  return (
    <G>
      <Line
        x1={level.x0 - 12}
        y1={level.y}
        x2={level.x1 + 12}
        y2={level.y}
        stroke={level.color}
        strokeWidth={1.5}
        strokeDasharray={level.dashed ? '4 2' : undefined}
      />
      <Text
        x={level.x1 + level.labelOffset}
        y={level.y + 4}
        fill={level.color}
        style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}
      >
        {level.label}
      </Text>
    </G>
  )
}

function PdfTankAnnotation({ annotation, color }: { annotation: TankSchematicAnnotation; color: string }) {
  const cx = (annotation.x1 + annotation.x2) / 2
  const cy = (annotation.y1 + annotation.y2) / 2
  const textX = annotation.vertical
    ? cx + (annotation.labelSide === 'start' ? -8 : 8)
    : cx

  return (
    <G>
      <Line x1={annotation.x1} y1={annotation.y1} x2={annotation.x2} y2={annotation.y2} stroke={color} strokeWidth={1} />
      <PdfArrowheads x1={annotation.x1} y1={annotation.y1} x2={annotation.x2} y2={annotation.y2} color={color} />
      <Text
        x={textX}
        y={annotation.vertical ? cy + 3 : cy - 6}
        textAnchor={annotation.vertical ? (annotation.labelSide === 'start' ? 'end' : 'start') : 'middle'}
        fill={color}
        style={{ fontSize: 10 }}
      >
        {annotation.label}
      </Text>
    </G>
  )
}

// ─── Schematic figure ─────────────────────────────────────────────────────────

function SchematicFigure({
  input,
  svgW = 420,
  svgH = 340,
}: {
  input: CalculationInput
  svgW?: number
  svgH?: number
}) {
  const mode   = input.equipmentMode ?? EquipmentMode.VESSEL
  const stroke = '#111827'
  const guide  = '#6b7280'
  const fill   = '#bfdbfe'
  const isTank = mode === EquipmentMode.TANK
  const isSphericalTank = isTank && input.tankType === TankType.SPHERICAL

  if (isTank) {
    const model = buildTankSchematicModel({
      input,
      width: isSphericalTank ? 620 : 600,
      height: isSphericalTank ? 380 : 420,
      padding: isSphericalTank ? 40 : 48,
    })

    if (!model) return null

    return (
      <>
        <Svg
          viewBox={`0 0 ${model.width} ${model.height}`}
          width={svgW}
          height={svgH}
        >
          <Defs>
            <ClipPath id={model.clipPath.id}>
              {model.clipPath.path && <Path d={model.clipPath.path} />}
              {model.clipPath.circle && (
                <Circle
                  cx={model.clipPath.circle.cx}
                  cy={model.clipPath.circle.cy}
                  r={model.clipPath.circle.r}
                />
              )}
            </ClipPath>
          </Defs>

          {model.liquidFill && (
            <Rect
              x={model.liquidFill.x}
              y={model.liquidFill.y}
              width={model.liquidFill.width}
              height={model.liquidFill.height}
              fill={fill}
              clipPath={`url(#${model.clipPath.id})`}
            />
          )}

          {model.outlines.paths.map((outline) => (
            <Path key={outline.key} d={outline.d} stroke={stroke} strokeWidth={2} fill="none" />
          ))}
          {model.outlines.rects.map((outline) => (
            <Rect
              key={outline.key}
              x={outline.x}
              y={outline.y}
              width={outline.width}
              height={outline.height}
              stroke={stroke}
              strokeWidth={2}
              fill="none"
            />
          ))}
          {model.outlines.circles.map((outline) => (
            <Circle key={outline.key} cx={outline.cx} cy={outline.cy} r={outline.r} stroke={stroke} strokeWidth={2} fill="none" />
          ))}
          {model.outlines.lines.map((outline) => (
            <Line
              key={outline.key}
              x1={outline.x1}
              y1={outline.y1}
              x2={outline.x2}
              y2={outline.y2}
              stroke={stroke}
              strokeWidth={outline.strokeWidth ?? 2}
              strokeDasharray={outline.dashed}
              opacity={outline.opacity}
            />
          ))}
          {model.levels.map((level) => <PdfTankLevelLine key={level.key} level={level} />)}
          {model.guideLines.map((guideLine) => (
            <Line
              key={guideLine.key}
              x1={guideLine.x1}
              y1={guideLine.y1}
              x2={guideLine.x2}
              y2={guideLine.y2}
              stroke={guide}
              strokeWidth={guideLine.strokeWidth ?? 0.75}
              opacity={guideLine.opacity ?? 0.7}
            />
          ))}
          {model.annotations.map((annotation) => (
            <PdfTankAnnotation key={annotation.key} annotation={annotation} color={guide} />
          ))}
        </Svg>
        {model.legend.showLiquid && (
          <View style={S.legendRow}>
            <LegendSwatch color="#bfdbfe" border="#38bdf8" label="Liquid" />
            {model.legend.showLegs && <LegendOutline label="Legs" />}
            {model.legend.showGround && <LegendDash color={stroke} label="Ground" />}
          </View>
        )}
        <Text style={[S.footerText, { textAlign: 'center', marginTop: 4, textTransform: 'uppercase' }]}>
          {model.subtitle}
        </Text>
      </>
    )
  }

  const model = buildVesselSchematicModel({
    input,
    width: 520,
    height: 420,
    padding: 48,
  })
  if (!model) return null

  return (
    <>
      <Svg viewBox={`0 0 ${model.width} ${model.height}`} width={svgW} height={svgH}>
        <Defs>
          <ClipPath id={model.clipPaths.vesselId}>
            <Path d={model.vesselPath} />
          </ClipPath>
          {model.bootPath && model.clipPaths.bootId && (
            <ClipPath id={model.clipPaths.bootId}>
              <Path d={model.bootPath} />
            </ClipPath>
          )}
        </Defs>

        {model.fills.vessel && (
          <Rect
            x={model.fills.vessel.x} y={model.fills.vessel.y}
            width={model.fills.vessel.width} height={model.fills.vessel.height}
            fill={fill} clipPath={`url(#${model.clipPaths.vesselId})`}
          />
        )}

        {model.breakMarker && (
          <G>
            <Rect
              x={model.breakMarker.background.x} y={model.breakMarker.background.y}
              width={model.breakMarker.background.width} height={model.breakMarker.background.height}
              fill={WHITE}
            />
            {model.breakMarker.wallSegments.map((s) => (
              <Line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={stroke} strokeWidth={2} />
            ))}
            {model.breakMarker.zigzags.map((s) => (
              <Path key={s.key} d={s.d} stroke={stroke} strokeWidth={1.5} fill="none" />
            ))}
          </G>
        )}

        {model.fills.boot && model.clipPaths.bootId && (
          <Rect
            x={model.fills.boot.x} y={model.fills.boot.y}
            width={model.fills.boot.width} height={model.fills.boot.height}
            fill={fill} clipPath={`url(#${model.clipPaths.bootId})`}
          />
        )}

        {model.outlines.map((o) => (
          <Path key={o.key} d={o.d} stroke={stroke} strokeWidth={2} fill="none" />
        ))}
        {model.legs.map((leg) => (
          <Line key={leg.key} x1={leg.x1} y1={leg.y1} x2={leg.x2} y2={leg.y2} stroke={stroke} strokeWidth={2} />
        ))}
        <Line
          x1={model.groundLine.x1} y1={model.groundLine.y1}
          x2={model.groundLine.x2} y2={model.groundLine.y2}
          stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8}
        />
        {model.levels.map((lv) => <PdfLevelLine key={lv.key} level={lv} />)}
        {model.guideLines.map((gl) => (
          <Line key={gl.key} x1={gl.x1} y1={gl.y1} x2={gl.x2} y2={gl.y2} stroke={guide} strokeWidth={0.75} />
        ))}
        {model.annotations.map((ann) => (
          <PdfAnnotation key={ann.key} annotation={ann} color={guide} />
        ))}
      </Svg>

      <View style={S.legendRow}>
        <LegendSwatch color="#bfdbfe" border="#38bdf8" label="Liquid" />
        {model.showLegs && <LegendOutline label="Legs" />}
        {model.hasBoot   && <LegendOutline label="Boot" thick />}
        <LegendDash color={stroke} label="Ground" />
        {model.legend.showHll && <LegendDash color="#22c55e" label="HLL" />}
        {model.legend.showLll && <LegendDash color="#f59e0b" label="LLL" />}
        {model.legend.showOfl && <LegendDash color="#ef4444" label="OFL" />}
      </View>
    </>
  )
}

// ─── Main document ────────────────────────────────────────────────────────────

export function CalculationReport({ input, result, metadata, revisions, units }: CalculationReportProps) {
  const vol  = units.volume
  const area = units.area
  const mass = units.mass
  const len  = units.length

  const { volumes: V, surfaceAreas: SA, masses: M, timing: T, headDepthUsed } = result
  const mode       = input.equipmentMode ?? EquipmentMode.VESSEL
  const isVertical = input.orientation === VesselOrientation.VERTICAL
  const isConical  = input.headType === HeadType.CONICAL

  // Derived values (base units = mm / m³ / kg / m² / m³/h)
  const insideRadius    = input.insideDiameter / 2
  const outsideDiameter = input.insideDiameter + 2 * (input.wallThickness ?? 0)
  const outsideRadius   = outsideDiameter / 2
  const overallHeight   = 2 * headDepthUsed + (input.shellLength ?? 0)
  const efficiencyPct   = V.totalVolume > 0
    ? (V.workingVolume / V.totalVolume * 100).toFixed(2)
    : '—'
  const surgeMinutes    = T.surgeTime != null ? (T.surgeTime * 60).toFixed(2) : '—'
  const inventoryHours  = T.inventory != null ? T.inventory.toFixed(2) : '—'
  const typeLabel       = `${input.orientation ?? ''} ${mode}`.trim().toUpperCase()
  const inventoryVol    = V.partialVolume != null
    ? fmt(V.partialVolume, BASE_UNITS.volume, vol)
    : fmt(V.effectiveVolume, BASE_UNITS.volume, vol)
  const flowUnitLabel   = ul('m3/h')
  const showVortex    = mode === EquipmentMode.TANK && result.vortexSubmergence != null
  const sketchWidth   = mode === EquipmentMode.TANK ? 360 : 420
  const sketchHeight  = mode === EquipmentMode.TANK
    ? (showVortex ? 220 : 250)
    : 300
  const sketchSectionHeight = mode === EquipmentMode.TANK
    ? (showVortex ? 270 : 300)
    : 270

  // Section visibility
  const showSurge     = input.flowrate != null && T.surgeTime != null
  const showInventory = input.flowrate != null && T.inventory != null

  // Shared section divider style
  const divider = { borderTopWidth: HB, borderTopColor: BLACK }

  return (
    <Document title={`Vessel Calculation — ${input.tag}`} author="GC ME Process Engineering Suite">
      <Page size="A4" style={S.page}>
        <View style={S.pageOuterFrame} fixed />
        <View style={S.disclaimerWrap} fixed>
          <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
        </View>
        <View style={S.outerBorder}>

          {/* ── Page header ──────────────────────────────────────────────── */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: HB,
            borderBottomColor: BLACK,
            paddingVertical: 4,
            paddingHorizontal: 8,
            minHeight: 22,
          }}>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
              SURFACE AREA AND VOLUME CALCULATION
            </Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: MUTED }}>
                MESUR&amp;VOL
              </Text>
            </View>
          </View>

          {/* ── Type row (spans left column only) ───────────────────────── */}
          <View style={{ flexDirection: 'row', borderBottomWidth: HB, borderBottomColor: BLACK }}>
            <View style={{ flex: 45, flexDirection: 'row', borderRightWidth: HB, borderRightColor: BLACK }}>
              <Text style={{
                width: 40, fontSize: 7, fontFamily: 'Helvetica-Bold',
                paddingHorizontal: 4, paddingVertical: 2,
                borderRightWidth: BW, borderRightColor: BLACK,
              }}>
                Type
              </Text>
              <Text style={{
                flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold',
                backgroundColor: VALUE_BG, textAlign: 'center',
                paddingHorizontal: 4, paddingVertical: 2,
              }}>
                {typeLabel}
              </Text>
            </View>
            <View style={{ flex: 55 }} />
          </View>

          {/* ── Two-column data body ─────────────────────────────────────── */}
          <View style={{ flexDirection: 'row' }}>

            {/* ════ LEFT COLUMN ════════════════════════════════════════════ */}
            <View style={{ flex: 45, borderRightWidth: HB, borderRightColor: BLACK }}>

              {/* I. VESSEL DETAILS */}
              <SecHeader prefix="I." title="VESSEL DETAILS" />
              <DR label="Inside Diameter"           value={fmt(input.insideDiameter, 'mm', len)} unit={ul(len)} />
              <DR label="Inside Radius"             value={fmt(insideRadius, 'mm', len)}          unit={ul(len)} />
              <DR label="Wall Thickness"            value={fmt(input.wallThickness, 'mm', len)}   unit={ul(len)} />
              <DR label="Shell Tan-Tan"             value={fmt(input.shellLength, 'mm', len)}     unit={ul(len)} />
              <DR label="Outside Diameter"          value={fmt(outsideDiameter, 'mm', len)}       unit={ul(len)} />
              <DR label="Outside Radius"            value={fmt(outsideRadius, 'mm', len)}         unit={ul(len)} />
              <DR label="Head type"                 value={input.headType ?? '—'}                  unit=""        hi />
              <DR label="Head Depth"                value={fmt(headDepthUsed, 'mm', len)}         unit={ul(len)} />
              {isConical && (
                <DR label="For Conical Enter Manually" value={fmt(input.headDepth, 'mm', len)} unit={ul(len)} ind />
              )}
              <DR label="High Liquid Level"         value={fmt(input.hll, 'mm', len)}             unit={ul(len)} />
              <DR label="Low Liquid Level"          value={fmt(input.lll, 'mm', len)}             unit={ul(len)} />
              <DR label="Overfill liquid level"     value={fmt(input.ofl, 'mm', len)}             unit={ul(len)} />
              {isVertical && (
                <DR label="Overall Height of Tank"  value={fmt(overallHeight, 'mm', len)}         unit={ul(len)} />
              )}
              <DR label="Liquid level from Bottom of Tank" value={fmt(input.liquidLevel, 'mm', len)} unit={ul(len)} />

              {/* × VOLUME */}
              <View style={divider}>
                <SecHeader prefix="×" title="VOLUME" />
                <DR label="Volume of Both Heads"  value={fmt(V.headVolume,      BASE_UNITS.volume, vol)} unit={ul(vol)} />
                <DR label="Shell Volume"          value={fmt(V.shellVolume,     BASE_UNITS.volume, vol)} unit={ul(vol)} />
                <DR label="Total Volume"          value={fmt(V.totalVolume,     BASE_UNITS.volume, vol)} unit={ul(vol)} />
                <DR label="Effective Volume"      value={fmt(V.effectiveVolume, BASE_UNITS.volume, vol)} unit={ul(vol)} />
                <DR label="Efficiency Volume"     value={efficiencyPct}                                   unit="%"       />
                <DR label="Tangent Volume"        value={fmt(V.tangentVolume,   BASE_UNITS.volume, vol)} unit={ul(vol)} />
                <DR label="Working Volume"        value={fmt(V.workingVolume,   BASE_UNITS.volume, vol)} unit={ul(vol)} />
                <DR label="Overflow Volume"       value={fmt(V.overflowVolume,  BASE_UNITS.volume, vol)} unit={ul(vol)} />
                <PartialVolumeRow
                  level={fmt(input.liquidLevel, 'mm', len)}
                  lUnit={ul(len)}
                  volume={V.partialVolume != null ? fmt(V.partialVolume, BASE_UNITS.volume, vol) : null}
                  vUnit={ul(vol)}
                />
              </View>

            </View>

            {/* ════ RIGHT COLUMN ═══════════════════════════════════════════ */}
            <View style={{ flex: 55 }}>

              {/* II. VESSEL MASS */}
              <SecHeader prefix="II." title="VESSEL MASS" />
              <DR label="Vessel Material"              value={input.material ?? '—'}                                              unit="" hi />
              <DR label="Vessel Material Density"      value={fmt(input.materialDensity, BASE_UNITS.density, units.density)}     unit={ul(units.density)} />
              <DR label="For Other Enter Manually"     value={null}                                                               unit={ul(units.density)} ind />
              <DR label="Empty Vessel Mass"            value={M.massEmpty  != null ? fmt(M.massEmpty,  BASE_UNITS.mass, mass) : '—'} unit={ul(mass)} />
              <DR label="Liquid Density"               value={fmt(input.density, BASE_UNITS.density, units.density)}             unit={ul(units.density)} />
              <DR label="Liquid Mass"                  value={M.massLiquid != null ? fmt(M.massLiquid, BASE_UNITS.mass, mass) : '—'} unit={ul(mass)} />
              <DR label="Liquid Full Vessel Mass"      value={M.massFull   != null ? fmt(M.massFull,   BASE_UNITS.mass, mass) : '—'} unit={ul(mass)} />

              {/* × SURFACE AREA */}
              <View style={divider}>
                <SecHeader prefix="×" title="SURFACE AREA" />
                <DR label="Surface Area of Both Heads" value={fmt(SA.headSurfaceArea,   BASE_UNITS.area, area)} unit={ul(area)} />
                <DR label="Shell Surface Area"         value={fmt(SA.shellSurfaceArea,  BASE_UNITS.area, area)} unit={ul(area)} />
                <DR label="Total Surface Area"         value={fmt(SA.totalSurfaceArea,  BASE_UNITS.area, area)} unit={ul(area)} />
                <DR label="Wetted Surface Area"        value={fmt(SA.wettedSurfaceArea, BASE_UNITS.area, area)} unit={ul(area)} />
              </View>

              {/* × SURGE TIME — conditional */}
              {showSurge && (
                <View style={divider}>
                  <SecHeader prefix="×" title="SURGE TIME" />
                  <DR label="Flow Out"            value={fmt(input.flowrate, 'm3/h', 'm3/h')} unit={flowUnitLabel} />
                  <DR label="Surge Time"          value={surgeMinutes}                         unit="min"          />
                  <DR label="Service"             value={input.description ?? '—'}             unit=""             hi />
                  <DR label="Surge Time Criteria" value={null}                                 unit=""             />
                </View>
              )}

              {/* × INVENTORY TIME — conditional */}
              {showInventory && (
                <View style={divider}>
                  <SecHeader prefix="×" title="INVENTORY TIME" />
                  <DR label="Flow Rate"      value={fmt(input.flowrate, 'm3/h', 'm3/h')} unit={flowUnitLabel}  />
                  <DR label="Volume"         value={inventoryVol}                         unit={ul(vol)}        />
                  <DR label="Inventory Time" value={inventoryHours}                       unit="h"              />
                </View>
              )}

              {showVortex && (
                <View style={divider}>
                  <SecHeader prefix="×" title="VORTEX LEVEL" />
                  <DR label="Outlet Fitting Diameter" value={fmt(input.outletFittingDiameter, 'mm', len)} unit={ul(len)} />
                  <DR label="Submergence"             value={fmt(result.vortexSubmergence, 'mm', len)}     unit={ul(len)} />
                </View>
              )}

            </View>
          </View>

          {/* ── SKETCH ───────────────────────────────────────────────────── */}
          <View style={{ flex: 1, minHeight: sketchSectionHeight, borderTopWidth: HB, borderTopColor: BLACK, padding: '4 6 4 6' }}>
            <View style={S.secHeader}>
              <Text style={S.secHeaderText}>SKETCH</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingBottom: 2 }}>
              <SchematicFigure input={input} svgW={sketchWidth} svgH={sketchHeight} />
            </View>
          </View>

          {/* ── Title block ───────────────────────────────────────────────── */}
          <TitleBlock metadata={metadata} revisions={revisions} />

        </View>

        {/* Footer (fixed — repeats if multi-page) */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>GC MAINTENANCE &amp; ENGINEERING COMPANY LIMITED</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
