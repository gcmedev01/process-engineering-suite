import {
  Document,
  Image,
  Page,
  Path,
  Circle,
  Line,
  Polyline,
  Polygon,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer'
import { GCME_LIGHT_LOGO_DATA_URI, GCME_LIGHT_LOGO_ASPECT } from '@eng-suite/ui-kit'
import {
  EquipmentType,
  PumpType,
  ShutoffMethod,
  type CalculationInput,
  type CalculationMetadata,
  type PumpCalculationResult,
  type RevisionRecord,
} from '@/types'

const NAVY = '#1f3864'
const BLUE = '#dbeafe'
const WHITE = '#ffffff'
const BLACK = '#000000'
const GUIDE = '#4b5563'
const MUTED = '#6b7280'
const RED = '#dc2626'
const BW = 0.5
const HB = 1
const G = 9.80665
const DOCUMENT_CODE = 'CA-PR-1050.0301'
const VALIDATION_REPORT = 'RPT-PR-XXXX-XXXX'
const DISCLAIMER =
  'This document is confidential proprietary and/or legally privileged, intended to be used within GCME Co.,Ltd. Unintended recipients are not allowed to distribute, copy, modify, retransmit, disseminate or use this document and/or information.'

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    padding: 0,
    color: BLACK,
    lineHeight: 1.2,
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
    backgroundColor: BLUE,
    textAlign: 'center',
    fontSize: 5.8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 10,
    borderBottomWidth: BW,
    borderBottomColor: '#d1d5db',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rowLabel: {
    flex: 2.9,
    color: GUIDE,
    fontSize: 6,
  },
  rowValueBox: {
    flex: 1.55,
    minHeight: 8,
    borderWidth: BW,
    borderColor: '#93c5fd',
    backgroundColor: BLUE,
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
  rowInlineNote: {
    flex: 1.1,
    fontSize: 5.5,
    color: MUTED,
    textAlign: 'center',
  },
  noteWrap: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: BW,
    borderBottomColor: '#d1d5db',
  },
  noteText: {
    fontSize: 6,
    color: RED,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  sketchSection: {
    flex: 1,
    minHeight: 150,
    borderBottomWidth: HB,
    borderBottomColor: BLACK,
    padding: 4,
  },
  sketchBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sketchCaption: {
    fontSize: 5.5,
    color: MUTED,
    textAlign: 'center',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 10,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 5.5,
    color: MUTED,
    marginLeft: 3,
  },
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

function fmt(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(decimals)
}

function str(value: string | null | undefined): string {
  return value?.trim() || '—'
}

function boolFlag(value: boolean | undefined): string {
  return value ? 'Yes' : 'No'
}

function shutoffMethodCode(method: ShutoffMethod | undefined): string {
  if (!method) return '—'
  if (method === ShutoffMethod.CURVE_FACTOR) return 'A'
  if (method === ShutoffMethod.HEAD_RATIO) return 'B'
  return 'C'
}

function joinPersonDate(person: string | undefined, date: string | undefined): string {
  return [person?.trim(), date?.trim()].filter(Boolean).join('  ')
}

function DataRow({
  label,
  value,
  unit,
  highlight,
  inlineNote,
}: {
  label: string
  value?: string | null
  unit?: string
  highlight?: boolean
  inlineNote?: string
}) {
  return (
    <View style={S.row}>
      <Text style={S.rowLabel}>{label}</Text>
      {inlineNote ? <Text style={S.rowInlineNote}>{inlineNote}</Text> : null}
      <View style={highlight ? S.rowValueBox : [S.rowValueBox, { backgroundColor: WHITE }]}>
        <Text style={S.rowValueText}>{value ?? '—'}</Text>
      </View>
      <Text style={S.rowUnit}>{unit ?? ''}</Text>
    </View>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View>
      <View style={S.sectionHeader}>
        <Text style={S.sectionHeaderText}>{title}</Text>
      </View>
      <View>{children}</View>
    </View>
  )
}

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
          {rows.map((rev, index) => (
            <View
              key={index}
              style={{
                ...revDataRowS,
                borderBottomWidth: index < rows.length - 1 ? BW : 0,
                borderBottomColor: '#e5e7eb',
              }}
            >
              <View style={revDataCellS}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>{rev?.rev ?? ''}</Text>
              </View>
              <View style={revDataCellS}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>{rev ? joinPersonDate(rev.by, rev.byDate) : ''}</Text>
              </View>
              <View style={revDataCellS}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>{rev ? joinPersonDate(rev.checkedBy, rev.checkedDate) : ''}</Text>
              </View>
              <View style={{ ...revDataCellS, borderRightWidth: 0 }}>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>{rev ? joinPersonDate(rev.approvedBy, rev.approvedDate) : ''}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 3, flexDirection: 'row', borderRightWidth: HB, borderRightColor: BLACK }}>
          <View style={{ width: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: BW, borderRightColor: BLACK, backgroundColor: WHITE, padding: 4 }}>
            <Image src={GCME_LIGHT_LOGO_DATA_URI} style={{ width: 36, height: 36 / GCME_LIGHT_LOGO_ASPECT }} />
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
        <Text style={{ fontSize: 5.5, color: WHITE }}>{DOCUMENT_CODE}</Text>
        <Text style={{ fontSize: 5.5, color: WHITE }}>VALIDATION REPORT : {VALIDATION_REPORT}</Text>
      </View>
    </View>
  )
}

function EquipmentShape({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <>
      <Rect x={x - 28} y={y - 20} width={56} height={40} stroke={BLACK} strokeWidth={1.2} fill="none" />
      <Text x={x} y={y + 3} textAnchor="middle" style={{ fontSize: 7 }}>{label}</Text>
    </>
  )
}

interface Point {
  x: number
  y: number
}

interface EquipmentLayout {
  center: Point
  nozzle: Point
  typeLabelY: number
  pressureLabelY: number
  elevationArrowX: number
}

interface SchematicLayout {
  source: EquipmentLayout
  destination: EquipmentLayout
  pumpLeft: number
  pumpRight: number
  suctionPoints: string
  dischargePoints: string
  suctionLossMidX: number
  dischargeLossMidX: number
}

const SKETCH_W = 800
const SKETCH_H = 420
const PUMP_CX = 400
const PUMP_CY = 220
const PUMP_R = 32
const EQUIP_W = 70
const EQUIP_H = 90
const EQUIP_HD = 10
const SOURCE_CX = 90
const DEST_CX = 710
const PIPE_Y = PUMP_CY
const GROUND_Y = 276
const VESSEL_BOTTOM_OFF = EQUIP_H / 2 + EQUIP_HD - 10
const COLUMN_H = EQUIP_H + 20
const COLUMN_BOTTOM_OFF = COLUMN_H / 2 + EQUIP_HD - 10
const HEADER_HALF_H = 55
const HEADER_CENTER_CY = 150
const HEADER_BRANCH_OFF = 100
const SOURCE_BOTTOM_CONNECT_CY = 145
const SOURCE_SIDE_CONNECT_CY = 165
const DESTINATION_CENTER_CY = 150
const TABLE_Y = 292

function numberOr(value: number | undefined, fallback = 0): number {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return fallback
  return value
}

function fmtKpa(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '--'
  return `${value.toFixed(1)} kPa`
}

function fmtM(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '--'
  return `${value.toFixed(1)} m`
}

function fmtFlow(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '--'
  return `${value.toFixed(1)} m3/h`
}

function isBottomConnect(type: EquipmentType): boolean {
  return type === EquipmentType.VESSEL || type === EquipmentType.COLUMN
}

function bottomOff(type: EquipmentType): number {
  return type === EquipmentType.COLUMN ? COLUMN_BOTTOM_OFF : VESSEL_BOTTOM_OFF
}

function equipTopY(type: EquipmentType, cy: number): number {
  switch (type) {
    case EquipmentType.COLUMN:
      return cy - COLUMN_H / 2 - EQUIP_HD
    case EquipmentType.VESSEL:
      return cy - EQUIP_H / 2 - EQUIP_HD
    case EquipmentType.HEADER:
      return cy - HEADER_HALF_H
    default:
      return cy - EQUIP_H / 2
  }
}

function deriveLayout(
  suctionSourceType: EquipmentType,
  dischargeDestType: EquipmentType,
): SchematicLayout {
  const sourceBottomConn = isBottomConnect(suctionSourceType)
  const sourceCenterY = sourceBottomConn
    ? SOURCE_BOTTOM_CONNECT_CY
    : suctionSourceType === EquipmentType.HEADER
      ? HEADER_CENTER_CY
      : SOURCE_SIDE_CONNECT_CY
  const destinationCenterY = dischargeDestType === EquipmentType.HEADER
    ? HEADER_CENTER_CY
    : DESTINATION_CENTER_CY

  const pumpLeft = PUMP_CX - PUMP_R
  const pumpRight = PUMP_CX + PUMP_R

  const sourceNozzle = {
    x: sourceBottomConn || suctionSourceType === EquipmentType.HEADER
      ? SOURCE_CX
      : SOURCE_CX + EQUIP_W / 2,
    y: sourceBottomConn ? sourceCenterY + bottomOff(suctionSourceType) : sourceCenterY,
  }

  const destinationNozzle = {
    x: dischargeDestType === EquipmentType.HEADER ? DEST_CX : DEST_CX - EQUIP_W / 2,
    y: destinationCenterY,
  }

  let suctionPoints: string
  if (sourceBottomConn) {
    suctionPoints = `${sourceNozzle.x},${sourceNozzle.y} ${SOURCE_CX},${PIPE_Y} ${pumpLeft},${PIPE_Y}`
  } else if (suctionSourceType === EquipmentType.HEADER) {
    const branchX = SOURCE_CX + HEADER_BRANCH_OFF
    suctionPoints = `${SOURCE_CX},${sourceCenterY} ${branchX},${sourceCenterY} ${branchX},${PIPE_Y} ${pumpLeft},${PIPE_Y}`
  } else {
    const midX = (sourceNozzle.x + pumpLeft) / 2
    suctionPoints = `${sourceNozzle.x},${sourceCenterY} ${midX},${sourceCenterY} ${midX},${PIPE_Y} ${pumpLeft},${PIPE_Y}`
  }

  let dischargePoints: string
  if (dischargeDestType === EquipmentType.HEADER) {
    const branchX = DEST_CX - HEADER_BRANCH_OFF
    dischargePoints = `${pumpRight},${PIPE_Y} ${branchX},${PIPE_Y} ${branchX},${destinationCenterY} ${DEST_CX},${destinationCenterY}`
  } else if (Math.abs(destinationNozzle.y - PIPE_Y) < 0.01) {
    dischargePoints = `${pumpRight},${PIPE_Y} ${destinationNozzle.x},${destinationNozzle.y}`
  } else {
    const midX = (pumpRight + destinationNozzle.x) / 2
    dischargePoints = `${pumpRight},${PIPE_Y} ${midX},${PIPE_Y} ${midX},${destinationNozzle.y} ${destinationNozzle.x},${destinationNozzle.y}`
  }

  return {
    source: {
      center: { x: SOURCE_CX, y: sourceCenterY },
      nozzle: sourceNozzle,
      typeLabelY: suctionSourceType === EquipmentType.HEADER
        ? sourceCenterY + HEADER_HALF_H + 14
        : sourceCenterY + EQUIP_H / 2 + 20,
      pressureLabelY: equipTopY(suctionSourceType, sourceCenterY) - 28,
      elevationArrowX: SOURCE_CX + EQUIP_W / 2 + 16,
    },
    destination: {
      center: { x: DEST_CX, y: destinationCenterY },
      nozzle: destinationNozzle,
      typeLabelY: dischargeDestType === EquipmentType.HEADER
        ? destinationCenterY + HEADER_HALF_H + 14
        : destinationCenterY + EQUIP_H / 2 + 20,
      pressureLabelY: equipTopY(dischargeDestType, destinationCenterY) - 28,
      elevationArrowX: DEST_CX - EQUIP_W / 2 - 16,
    },
    pumpLeft,
    pumpRight,
    suctionPoints,
    dischargePoints,
    suctionLossMidX: sourceBottomConn
      ? (SOURCE_CX + pumpLeft) / 2 + 20
      : suctionSourceType === EquipmentType.HEADER
        ? (SOURCE_CX + pumpLeft) / 2
        : (SOURCE_CX + EQUIP_W / 2 + pumpLeft) / 2,
    dischargeLossMidX: dischargeDestType === EquipmentType.HEADER
      ? (pumpRight + DEST_CX) / 2
      : (pumpRight + destinationNozzle.x) / 2,
  }
}

function PdfEquipmentShape({
  cx,
  cy,
  type,
}: {
  cx: number
  cy: number
  type: EquipmentType
}) {
  const x = cx - EQUIP_W / 2
  const y = cy - EQUIP_H / 2
  const w = EQUIP_W
  const h = EQUIP_H

  switch (type) {
    case EquipmentType.VESSEL: {
      const path =
        `M ${x},${y + EQUIP_HD} L ${x + w},${y + EQUIP_HD} L ${x + w},${y + h - EQUIP_HD} L ${x},${y + h - EQUIP_HD} Z` +
        ` M ${x + w},${y + EQUIP_HD} A ${w / 2},${EQUIP_HD} 0 0 0 ${x},${y + EQUIP_HD}` +
        ` M ${x},${y + h - EQUIP_HD} A ${w / 2},${EQUIP_HD} 0 0 0 ${x + w},${y + h - EQUIP_HD}`
      return <Path d={path} fill="none" stroke={BLACK} strokeWidth={1.6} opacity={0.72} />
    }
    case EquipmentType.TANK: {
      const roofH = 16
      const path = `M ${x},${y + roofH} L ${x + w / 2},${y} L ${x + w},${y + roofH} L ${x + w},${y + h} L ${x},${y + h} Z`
      return <Path d={path} fill="none" stroke={BLACK} strokeWidth={1.6} opacity={0.72} />
    }
    case EquipmentType.COLUMN: {
      const cw = 40
      const ch = COLUMN_H
      const cx2 = cx - cw / 2
      const cy2 = cy - ch / 2
      return (
        <>
          <Path
            d={
              `M ${cx2},${cy2 + EQUIP_HD} L ${cx2 + cw},${cy2 + EQUIP_HD} L ${cx2 + cw},${cy2 + ch - EQUIP_HD} L ${cx2},${cy2 + ch - EQUIP_HD} Z` +
              ` M ${cx2 + cw},${cy2 + EQUIP_HD} A ${cw / 2},${EQUIP_HD} 0 0 0 ${cx2},${cy2 + EQUIP_HD}` +
              ` M ${cx2},${cy2 + ch - EQUIP_HD} A ${cw / 2},${EQUIP_HD} 0 0 0 ${cx2 + cw},${cy2 + ch - EQUIP_HD}`
            }
            fill="none"
            stroke={BLACK}
            strokeWidth={1.6}
            opacity={0.72}
          />
          {[1, 2, 3].map((i) => {
            const traySpacing = (ch - 2 * EQUIP_HD) / 4
            const trayY = cy2 + EQUIP_HD + i * traySpacing
            return <Line key={i} x1={cx2} y1={trayY} x2={cx2 + cw} y2={trayY} stroke={BLACK} strokeWidth={1.2} opacity={0.72} />
          })}
        </>
      )
    }
    case EquipmentType.HEADER:
      return (
        <>
          <Line x1={cx} y1={cy - HEADER_HALF_H} x2={cx} y2={cy + HEADER_HALF_H} stroke={BLACK} strokeWidth={7} opacity={0.75} />
          <Line x1={cx - 9} y1={cy - HEADER_HALF_H} x2={cx + 9} y2={cy - HEADER_HALF_H} stroke={BLACK} strokeWidth={2} opacity={0.75} />
          <Line x1={cx - 9} y1={cy + HEADER_HALF_H} x2={cx + 9} y2={cy + HEADER_HALF_H} stroke={BLACK} strokeWidth={2} opacity={0.75} />
        </>
      )
    case EquipmentType.ATMOSPHERIC: {
      return (
        <>
          <Path d={`M ${x},${y} L ${x},${y + h} L ${x + w},${y + h} L ${x + w},${y}`} fill="none" stroke={BLACK} strokeWidth={1.6} opacity={0.72} />
          <Line x1={x} y1={y} x2={x + w} y2={y} stroke={BLACK} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.45} />
          <Text x={cx} y={y + h / 2 + 4} textAnchor="middle" style={{ fontSize: 8, color: GUIDE }}>ATM</Text>
        </>
      )
    }
  }
}

function PdfPumpSymbol({ cx, cy, type }: { cx: number; cy: number; type: PumpType }) {
  if (type === PumpType.CENTRIFUGAL) {
    const wedgePoints = [
      `${cx - 6},${cy - (PUMP_R - 2)}`,
      `${cx + PUMP_R - 1},${cy}`,
      `${cx - 6},${cy + (PUMP_R - 2)}`,
    ].join(' ')
    return (
      <>
        <Circle cx={cx} cy={cy} r={PUMP_R} fill="none" stroke={BLACK} strokeWidth={2.6} />
        <Line x1={cx - 6} y1={cy - (PUMP_R - 2)} x2={cx + PUMP_R - 1} y2={cy} stroke={BLACK} strokeWidth={1.8} />
        <Line x1={cx - 6} y1={cy + (PUMP_R - 2)} x2={cx + PUMP_R - 1} y2={cy} stroke={BLACK} strokeWidth={1.8} />
        <Polygon points={wedgePoints} fill={BLACK} opacity={0} />
      </>
    )
  }

  const pw = PUMP_R * 1.6
  const ph = PUMP_R * 1.2
  return (
    <>
      <Rect x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} rx={6} fill={WHITE} stroke={BLACK} strokeWidth={2.3} />
      <Line x1={cx - pw / 2 + 8} y1={cy + ph / 2 - 8} x2={cx + pw / 2 - 8} y2={cy - ph / 2 + 8} stroke={BLACK} strokeWidth={1.5} />
    </>
  )
}

function PdfMetricLabel({
  x,
  y,
  label,
  value,
  align = 'middle',
}: {
  x: number
  y: number
  label: string
  value: string
  align?: 'start' | 'middle' | 'end'
}) {
  return (
    <>
      <Text x={x} y={y} textAnchor={align} style={{ fontSize: 8.5, color: GUIDE }}>
        {label}
      </Text>
      <Text x={x} y={y + 12} textAnchor={align} style={{ fontSize: 10.5, fontFamily: 'Helvetica-Bold' }}>
        {value}
      </Text>
    </>
  )
}

function PdfLossCallout({
  x,
  y,
  label,
  value,
}: {
  x: number
  y: number
  label: string
  value: string
}) {
  return (
    <>
      <Rect x={x - 34} y={y - 15} width={68} height={28} rx={2} fill="none" stroke={BLACK} opacity={0.28} />
      <Line x1={x - 34} y1={y - 1} x2={x + 34} y2={y - 1} stroke={BLACK} opacity={0.16} />
      <Text x={x} y={y - 5} textAnchor="middle" style={{ fontSize: 7, color: GUIDE }}>
        {label}
      </Text>
      <Text x={x} y={y + 8} textAnchor="middle" style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
        {value}
      </Text>
    </>
  )
}

function PdfElevationArrow({
  x,
  pumpY,
  equipCY,
  elevM,
}: {
  x: number
  pumpY: number
  equipCY: number
  elevM: number
}) {
  if (Math.abs(elevM) < 0.01) return null
  const minY = Math.min(pumpY, equipCY)
  const maxY = Math.max(pumpY, equipCY)
  const midY = (minY + maxY) / 2
  return (
    <>
      <Line x1={x} y1={minY} x2={x} y2={maxY} stroke={BLACK} strokeWidth={1} opacity={0.45} />
      <Text x={x + 4} y={midY + 2} style={{ fontSize: 8, color: GUIDE }}>
        {fmtM(Math.abs(elevM))}
      </Text>
    </>
  )
}

function PdfDataTableSection({
  x,
  y,
  width,
  title,
  lines,
}: {
  x: number
  y: number
  width: number
  title: string
  lines: Array<{ label: string; value: string }>
}) {
  const height = 74
  return (
    <>
      <Rect x={x} y={y} width={width} height={height} rx={2} fill="none" stroke={BLACK} opacity={0.3} />
      <Line x1={x} y1={y + 22} x2={x + width} y2={y + 22} stroke={BLACK} opacity={0.2} />
      <Text x={x + 10} y={y + 14} style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{title}</Text>
      {lines.map((line, index) => {
        const rowY = y + 37 + index * 17
        return (
          <View key={`${title}-${line.label}`}>
            <Text x={x + 10} y={rowY} style={{ fontSize: 7.5, color: GUIDE }}>{line.label}</Text>
            <Text x={x + width - 10} y={rowY} textAnchor="end" style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold' }}>{line.value}</Text>
          </View>
        )
      })}
    </>
  )
}

function PumpSketch({
  input,
  result,
}: {
  input: CalculationInput
  result: PumpCalculationResult
}) {
  const suctionSourceType = input.suctionSourceType ?? EquipmentType.VESSEL
  const dischargeDestType = input.dischargeDestType ?? EquipmentType.VESSEL
  const isPd = input.pumpType === PumpType.POSITIVE_DISPLACEMENT
  const suctionElevation = numberOr(input.suctionElevation)
  const dischargeElevation = numberOr(input.dischargeElevation)
  const suctionSourcePressure = input.suctionSourcePressure
  const dischargeDestPressure = input.dischargeDestPressure
  const flowDesign = input.flowDesign
  const tag = input.tag
  const layout = deriveLayout(suctionSourceType, dischargeDestType)

  const suctionLosses = [
    { label: 'Line', value: numberOr(input.suctionLineLoss), show: numberOr(input.suctionLineLoss) > 0 },
    { label: 'Strainer', value: numberOr(input.suctionStrainerLoss), show: numberOr(input.suctionStrainerLoss) > 0 },
    { label: 'Other', value: numberOr(input.suctionOtherLoss), show: numberOr(input.suctionOtherLoss) > 0 },
  ].filter((loss) => loss.show)

  const dischargeLosses = [
    { label: 'Equip', value: numberOr(input.dischargeEquipmentDp), show: numberOr(input.dischargeEquipmentDp) > 0 },
    { label: 'Line', value: numberOr(input.dischargeLineLoss), show: numberOr(input.dischargeLineLoss) > 0 },
    { label: 'Flow', value: numberOr(input.dischargeFlowElementDp), show: numberOr(input.dischargeFlowElementDp) > 0 },
    { label: 'Valve', value: numberOr(input.dischargeControlValveDp), show: numberOr(input.dischargeControlValveDp) > 0 },
    { label: 'Margin', value: numberOr(input.dischargeDesignMargin), show: numberOr(input.dischargeDesignMargin) > 0 },
  ].filter((loss) => loss.show)

  const suctionSummary = [
    { label: 'Source', value: suctionSourceType },
    { label: 'Source P', value: fmtKpa(suctionSourcePressure) },
    { label: 'Pump inlet', value: fmtKpa(result?.suctionPressureKpa) },
  ]
  const operatingSummary = [
    { label: 'Flow', value: fmtFlow(flowDesign) },
    { label: 'Diff head', value: fmtM(result?.differentialHead) },
    { label: 'Pump dP', value: fmtKpa(result?.differentialPressureKpa) },
  ]
  const dischargeSummary = [
    { label: 'Destination', value: dischargeDestType },
    { label: 'Pump outlet', value: fmtKpa(result?.dischargePressureKpa) },
    { label: 'Dest P', value: fmtKpa(dischargeDestPressure) },
  ]

  return (
    <>
      <Svg viewBox={`0 0 ${SKETCH_W} ${SKETCH_H}`} width={430} height={226}>
        <Text x={34} y={36} style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>PUMP SYSTEM SCHEMATIC</Text>
        <Text x={766} y={36} textAnchor="end" style={{ fontSize: 8, color: GUIDE }}>NOT TO SCALE</Text>

        <PdfDataTableSection x={34} y={TABLE_Y} width={220} title="SUCTION DATA" lines={suctionSummary} />
        <PdfDataTableSection x={290} y={TABLE_Y} width={220} title="OPERATING DATA" lines={operatingSummary} />
        <PdfDataTableSection x={546} y={TABLE_Y} width={220} title="DISCHARGE DATA" lines={dischargeSummary} />

        <Line x1={34} y1={GROUND_Y} x2={766} y2={GROUND_Y} stroke={BLACK} strokeWidth={1} strokeDasharray="5 4" opacity={0.16} />
        <Line x1={layout.pumpLeft - 12} y1={PUMP_CY} x2={layout.pumpRight + 12} y2={PUMP_CY} stroke={BLACK} strokeWidth={0.7} strokeDasharray="4 4" opacity={0.14} />

        <PdfEquipmentShape cx={layout.source.center.x} cy={layout.source.center.y} type={suctionSourceType} />
        <PdfEquipmentShape cx={layout.destination.center.x} cy={layout.destination.center.y} type={dischargeDestType} />

        <Text x={layout.source.center.x} y={layout.source.typeLabelY} textAnchor="middle" style={{ fontSize: 8.5, color: GUIDE }}>
          {suctionSourceType}
        </Text>
        <Text x={layout.destination.center.x} y={layout.destination.typeLabelY} textAnchor="middle" style={{ fontSize: 8.5, color: GUIDE }}>
          {dischargeDestType}
        </Text>

        <Polyline points={layout.suctionPoints} fill="none" stroke={BLACK} strokeOpacity={0.92} strokeWidth={2} />
        <Polyline points={layout.dischargePoints} fill="none" stroke={BLACK} strokeOpacity={0.92} strokeWidth={2} />

        <Circle cx={layout.pumpLeft} cy={PIPE_Y} r={4.5} fill={BLACK} opacity={0.8} />
        <Circle cx={layout.pumpRight} cy={PIPE_Y} r={4.5} fill={BLACK} opacity={0.8} />

        <PdfPumpSymbol cx={PUMP_CX} cy={PUMP_CY} type={input.pumpType} />
        {tag ? (
          <Text x={PUMP_CX} y={PUMP_CY + PUMP_R + 16} textAnchor="middle" style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
            {tag}
          </Text>
        ) : null}

        <PdfMetricLabel x={layout.source.center.x} y={layout.source.pressureLabelY} label="Source P" value={fmtKpa(suctionSourcePressure)} />
        <PdfMetricLabel x={layout.destination.center.x} y={layout.destination.pressureLabelY} label="Dest P" value={fmtKpa(dischargeDestPressure)} />
        <PdfMetricLabel x={layout.pumpLeft - 14} y={PIPE_Y - 28} label="P suction" value={fmtKpa(result?.suctionPressureKpa)} align="end" />
        <PdfMetricLabel x={layout.pumpRight + 14} y={PIPE_Y - 28} label="P discharge" value={fmtKpa(result?.dischargePressureKpa)} align="start" />

        {suctionLosses.length > 0
          ? suctionLosses.map((loss, index) => (
              <PdfLossCallout
                key={`suction-${loss.label}`}
                x={layout.suctionLossMidX - (suctionLosses.length - 1) * 34 + index * 68}
                y={PIPE_Y + 46}
                label={`-${loss.label}`}
                value={fmtKpa(loss.value)}
              />
            ))
          : <PdfLossCallout x={layout.suctionLossMidX} y={PIPE_Y + 46} label="Suction" value="clean" />
        }

        {dischargeLosses.length > 0
          ? dischargeLosses.map((loss, index) => {
              const count = dischargeLosses.length
              const span = Math.abs(layout.dischargeLossMidX - layout.pumpRight) * 1.5
              const spacing = Math.min(74, span / Math.max(count, 1))
              const startX = layout.dischargeLossMidX - ((count - 1) * spacing) / 2
              return (
                <PdfLossCallout
                  key={`discharge-${loss.label}`}
                  x={startX + index * spacing}
                  y={PIPE_Y + 46}
                  label={`+${loss.label}`}
                  value={fmtKpa(loss.value)}
                />
              )
            })
          : <PdfLossCallout x={layout.dischargeLossMidX} y={PIPE_Y + 46} label="Discharge" value="clean" />
        }

        <PdfElevationArrow x={layout.source.elevationArrowX} pumpY={PUMP_CY} equipCY={layout.source.center.y} elevM={suctionElevation} />
        <PdfElevationArrow x={layout.destination.elevationArrowX} pumpY={PUMP_CY} equipCY={layout.destination.center.y} elevM={dischargeElevation} />
      </Svg>

      <View style={S.legendRow}>
        <View style={S.legendItem}>
          <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: BLACK }} />
          <Text style={S.legendLabel}>EQUIPMENT</Text>
        </View>
        <View style={S.legendItem}>
          <View style={{ width: 14, height: 0, borderTopWidth: 1.5, borderTopColor: BLACK }} />
          <Text style={S.legendLabel}>PROCESS LINE</Text>
        </View>
      </View>
      <Text style={S.sketchCaption}>
        {isPd ? 'Positive displacement pump system schematic' : 'Centrifugal pump system schematic'}
      </Text>
    </>
  )
}

interface Props {
  input: CalculationInput
  result: PumpCalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}

export function CalculationReport({ input, result, metadata, revisions }: Props) {
  const isPd = input.pumpType === PumpType.POSITIVE_DISPLACEMENT
  const suctionStaticKpa = input.sg * G * input.suctionElevation
  const dischargeStaticKpa = input.sg * G * input.dischargeElevation
  const lineAndFittingLoss = input.suctionLineLoss + input.suctionOtherLoss

  return (
    <Document title={`Pump Calculation - ${input.tag || 'report'}`}>
      <Page size="A4" style={S.page}>
        <View style={S.pageOuterFrame} fixed />
        <View style={S.disclaimerWrap} fixed>
          <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
        </View>
        <View style={S.outerBorder}>
          <View style={S.topHeader}>
            <Text style={S.topHeaderTitle}>PUMP</Text>
            <Text style={S.topHeaderCode}>MEPUMP</Text>
          </View>

          <View style={S.typeRow}>
            <Text style={S.typeLabel}>PUMPTYPE</Text>
            <Text style={S.typeValue}>{input.pumpType}</Text>
          </View>

          <View style={S.bodyRow}>
            <View style={S.leftCol}>
              <Section title="I. FLUID DATA">
                <DataRow label="Fluid Pumped" value={str(input.fluidName)} />
                <DataRow label="Design Flow Rate" value={fmt(input.flowDesign, 2)} unit="m3/h" highlight />
                <DataRow label="Specific Gravity" value={fmt(input.sg, 3)} />
                <DataRow label="Vapour Pressure" value={fmt(input.vapourPressure, 2)} unit="kPaa" />
              </Section>

              <Section title="II. SUCTION CONDITIONS">
                <DataRow label="Source Operating Pressure" value={fmt(input.suctionSourcePressure, 2)} unit="kPaa" />
                <DataRow label="Suction Above Centerline Pump" value={fmt(input.suctionElevation, 2)} unit="m" />
                <DataRow label="Static Head" value={fmt(suctionStaticKpa, 2)} unit="kPa" />
                <DataRow label="Line and Fitting Loss" value={fmt(lineAndFittingLoss, 2)} unit="kPa" />
                <DataRow label="Suction Strainer" value={fmt(input.suctionStrainerLoss, 2)} unit="kPa" />
                <DataRow label="Other" value={fmt(input.suctionOtherLoss, 2)} unit="kPa" />
                <DataRow label="Suction Pressure" value={fmt(result.suctionPressureKpa, 2)} unit="kPaa" highlight />
              </Section>

              <Section title="IV. N.P.S.H.A">
                <DataRow label="N.P.S.H.a (No margin)" value={fmt(result.npsha, 2)} unit="m" highlight />
                <DataRow label="Required" value="—" unit="m" />
                <DataRow label="Acceleration Loss" value={fmt(result.accelHead ?? 0, 2)} unit="m" />
                <DataRow label="N.P.S.H.a (Margin Deducted)" value="—" unit="m" />
              </Section>

              <Section title="V. MOTOR ESTIMATE">
                <DataRow label="Flow Margin for Pump Wear and Tear" value={fmt(input.wearMarginPct, 1)} unit="%" />
                <DataRow label="Flow for Pump Motor Sizing" value={fmt(input.flowDesign, 2)} unit="m3/h" />
                <DataRow label="Rated Head" value={fmt(result.differentialHead, 2)} unit="m" />
                <DataRow label="Hydraulic Power" value={fmt(result.hydraulicPowerKw, 2)} unit="kW" />
                <DataRow label="Estimated Efficiency (Centrifugal)" value={fmt(input.efficiency, 1)} unit="%" />
                <DataRow label="Applied Efficiency" value={fmt(input.efficiency, 1)} unit="%" />
                <DataRow label="Motor Shaft Power" value={fmt(result.shaftPowerKw, 2)} unit="kW" />
                <DataRow label="Min API Recom. Motor" value={fmt(result.apiMinMotorKw, 2)} unit="kW" />
                <DataRow label="Suggest Std. Motor" value={fmt(result.recommendedMotorKw, 0)} unit="kW" highlight />
              </Section>

              <Section title="VI. FLOW ORIFICE PRESSURE DROP ESTIMATE">
                <DataRow label="Pipe I.D." value={fmt(input.orificePipeId, 2)} unit="mm" />
                <DataRow label="Beta Ratio" value={fmt(input.orificeBeta, 3)} />
                <DataRow label="Pressure Loss" value={fmt(result.orificeDeltaPKpa, 2)} unit="kPa" highlight={result.orificeDeltaPKpa != null} />
              </Section>

              <Section title="VII. RECOMMENDED CONTROL VALVE PRESSURE DROP">
                <DataRow label="Type" value={str(input.cvValveType)} />
                <DataRow label="Flow ratio (Max/Design)" value={fmt(input.cvFlowRatio, 3)} unit="—" />
                <DataRow label="Recommended valve pressure drop" value={fmt(result.recommendedCvDeltaPKpa, 2)} unit="kPa" highlight={result.recommendedCvDeltaPKpa != null} />
              </Section>
            </View>

            <View style={S.rightCol}>
              <Section title="III. DISCHARGE CONDITIONS">
                <DataRow label="Destination Operating Pressure" value={fmt(input.dischargeDestPressure, 2)} unit="kPaa" />
                <DataRow label="Elevation from Pump to Destination" value={fmt(input.dischargeElevation, 2)} unit="m" />
                <DataRow label="Static Head" value={fmt(dischargeStaticKpa, 2)} unit="kPa" />
                <DataRow label="Equipment ΔP" value={fmt(input.dischargeEquipmentDp, 2)} unit="kPa" />
                <DataRow label="Line and Fitting Loss" value={fmt(input.dischargeLineLoss, 2)} unit="kPa" />
                <DataRow label="Flow Element" value={fmt(input.dischargeFlowElementDp, 2)} unit="kPa" />
                <DataRow label="Control Valve" value={fmt(input.dischargeControlValveDp, 2)} unit="kPa" />
                <DataRow label="Design Margin" value={fmt(input.dischargeDesignMargin, 2)} unit="kPa" inlineNote={boolFlag(input.isExistingSystem)} />
                <DataRow label="Discharge Pressure" value={fmt(result.dischargePressureKpa, 2)} unit="kPaa" highlight />
              </Section>

              <Section title="IX. POSITIVE DISPLACEMENT PUMP SUCTION ACCELERATION LOSS">
                {isPd ? (
                  <>
                    <DataRow label="Pump Type" value={str(input.pdSubtype ?? input.pumpType)} />
                    <DataRow label="Pump Speed" value={fmt(input.pumpSpeed, 0)} unit="rpm" />
                    <DataRow label="Factor for Compressibility" value={fmt(input.compressibilityFactor, 2)} />
                    <DataRow label="Acceleration Loss" value={fmt(result.accelHead, 2)} unit="m" highlight={result.accelHead != null} />
                  </>
                ) : (
                  <View style={S.noteWrap}>
                    <Text style={S.noteText}>Not applicable for centrifugal pump</Text>
                  </View>
                )}
              </Section>

              <Section title="X. SHUTOFF PRESSURE ESTIMATE">
                {isPd ? (
                  <View style={S.noteWrap}>
                    <Text style={S.noteText}>Shutoff pressure estimate is available for centrifugal pump</Text>
                  </View>
                ) : (
                  <>
                    <DataRow label="Method" value={shutoffMethodCode(input.shutoffMethod)} />
                    <DataRow label="Suction Pressure" value={fmt(result.suctionPressureKpa, 2)} unit="kPaa" />
                    <DataRow label="Shutoff Head" value={fmt(result.shutoffHead, 2)} unit="m" highlight={result.shutoffHead != null} />
                    <DataRow label="Shutoff Pressure" value={fmt(result.shutoffPressureKpa, 2)} unit="kPaa" highlight={result.shutoffPressureKpa != null} />
                    <DataRow label="Shutoff Power" value={fmt(result.shutoffPowerKw, 2)} unit="kW" />
                  </>
                )}
              </Section>

              <Section title="X. MINIMUM FLOW DUE TO TEMPERATURE RISE ESTIMATE">
                {isPd ? (
                  <View style={S.noteWrap}>
                    <Text style={S.noteText}>Minimum flow estimate is available for centrifugal pump</Text>
                  </View>
                ) : (
                  <>
                    <DataRow label="Heat at Shutoff Condition" value={fmt(result.shutoffPowerKw, 2)} unit="kW" />
                    <DataRow label="Shutoff Horsepower" value={fmt(result.shutoffPowerKw, 2)} unit="kW" />
                    <DataRow label="Fluid Heat Capacity" value={fmt(input.specificHeat, 2)} unit="kJ/kg°C" />
                    <DataRow label="Temperature Rise" value={fmt(input.allowedTempRise, 2)} unit="°C" />
                    <DataRow label="Minimum Flow" value={fmt(result.minFlowM3h, 2)} unit="m3/h" highlight={result.minFlowM3h != null} />
                  </>
                )}
              </Section>
            </View>
          </View>

          <View style={S.sketchSection}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionHeaderText}>SKETCH</Text>
            </View>
            <View style={S.sketchBody}>
              <PumpSketch input={input} result={result} />
            </View>
          </View>

          <TitleBlock metadata={metadata} revisions={revisions} />
        </View>
      </Page>
    </Document>
  )
}
