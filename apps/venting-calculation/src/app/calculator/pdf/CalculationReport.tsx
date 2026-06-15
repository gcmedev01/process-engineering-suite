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
  OutgoingStream,
  RevisionRecord,
  Stream,
} from '@/types'

const NAVY = '#1f3864'
const BLUE = '#dbeafe'
const LIGHT = '#eef6fb'
const WHITE = '#ffffff'
const BLACK = '#000000'
const GUIDE = '#4b5563'
const MUTED = '#6b7280'
const BW = 0.5
const HB = 1
const VALIDATION_REPORT = 'RPT-PR-XXXX-XXXX'

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 6.2,
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
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  topHeaderCode: {
    position: 'absolute',
    right: 6,
    top: 4,
    fontSize: 5,
    color: MUTED,
    fontFamily: 'Helvetica-Bold',
  },
  idRow: {
    flexDirection: 'row',
    borderBottomWidth: HB,
    borderBottomColor: BLACK,
    minHeight: 18,
  },
  idCell: {
    flexDirection: 'row',
    flex: 1,
    borderRightWidth: BW,
    borderRightColor: BLACK,
  },
  idLabel: {
    width: 52,
    paddingHorizontal: 4,
    paddingVertical: 3,
    fontSize: 5.7,
    fontFamily: 'Helvetica-Bold',
    color: GUIDE,
  },
  idValueWrap: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  idValueBox: {
    minHeight: 10,
    backgroundColor: BLUE,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  idValueText: {
    fontSize: 6.2,
    fontFamily: 'Helvetica-Bold',
  },
  clearCell: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  clearText: {
    fontSize: 5.5,
    color: GUIDE,
  },
  section: {
    margin: 4,
    borderWidth: BW,
    borderColor: BLACK,
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
  sectionBody: {
    padding: 5,
  },
  twoCol: {
    flexDirection: 'row',
    columnGap: 10,
  },
  col: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 9,
    paddingVertical: 1,
  },
  rowLabel: {
    flex: 2.4,
    fontSize: 5.8,
    color: GUIDE,
  },
  rowValueBox: {
    flex: 1.15,
    minHeight: 8,
    borderWidth: BW,
    borderColor: '#93c5fd',
    backgroundColor: BLUE,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  rowValueText: {
    fontSize: 5.8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  rowUnit: {
    width: 28,
    paddingLeft: 3,
    fontSize: 5.5,
    color: MUTED,
  },
  streamWrap: {
    marginTop: 6,
  },
  streamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  streamHeaderText: {
    fontSize: 5.8,
    fontFamily: 'Helvetica-Bold',
    color: GUIDE,
  },
  streamTable: {
    borderWidth: BW,
    borderColor: BLACK,
  },
  streamTableHead: {
    flexDirection: 'row',
    borderBottomWidth: BW,
    borderBottomColor: BLACK,
    backgroundColor: LIGHT,
    minHeight: 11,
    alignItems: 'center',
  },
  streamHeadCell: {
    fontSize: 5.6,
    fontFamily: 'Helvetica-Bold',
    color: GUIDE,
    paddingHorizontal: 3,
  },
  streamRow: {
    flexDirection: 'row',
    minHeight: 10,
    borderBottomWidth: BW,
    borderBottomColor: '#d1d5db',
    alignItems: 'center',
  },
  streamCell: {
    fontSize: 5.5,
    paddingHorizontal: 3,
  },
  calcGrid: {
    flexDirection: 'row',
    columnGap: 10,
  },
  calcBlock: {
    flex: 1,
  },
  calcSubTitle: {
    fontSize: 5.9,
    fontFamily: 'Helvetica-Bold',
    color: GUIDE,
    marginBottom: 3,
  },
  noteArea: {
    flex: 1,
    minHeight: 80,
    borderTopWidth: HB,
    borderTopColor: BLACK,
    backgroundColor: '#d7edf6',
    padding: 5,
  },
  noteLabel: {
    fontSize: 5.8,
    fontFamily: 'Helvetica-Bold',
    color: GUIDE,
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

function streamRows(streams: Stream[] | OutgoingStream[]): Array<Stream | OutgoingStream | null> {
  return [
    ...streams.slice(0, 10),
    ...Array(Math.max(0, 10 - streams.length)).fill(null),
  ]
}

function joinPersonDate(person: string | undefined, date: string | undefined): string {
  return [person?.trim(), date?.trim()].filter(Boolean).join('  ')
}

function DataRow({
  label,
  value,
  unit,
}: {
  label: string
  value?: string | null
  unit?: string
}) {
  return (
    <View style={S.row}>
      <Text style={S.rowLabel}>{label}</Text>
      <View style={S.rowValueBox}>
        <Text style={S.rowValueText}>{value ?? '—'}</Text>
      </View>
      <Text style={S.rowUnit}>{unit ?? ''}</Text>
    </View>
  )
}

function StreamTable({
  title,
  streams,
  total,
}: {
  title: string
  streams: Stream[] | OutgoingStream[]
  total: number
}) {
  const rows = streamRows(streams)

  return (
    <View style={[S.calcBlock, S.streamWrap]}>
      <View style={S.streamHeaderRow}>
        <Text style={S.streamHeaderText}>{title}</Text>
      </View>
      <View style={S.streamTable}>
        <View style={S.streamTableHead}>
          <Text style={[S.streamHeadCell, { width: 20 }]} />
          <Text style={[S.streamHeadCell, { flex: 1.2 }]}>Stream No.</Text>
          <Text style={[S.streamHeadCell, { flex: 1.1, textAlign: 'right' }]}>Flowrate (m3/h)</Text>
        </View>
        {rows.map((row, index) => (
          <View
            key={`${title}-${index}`}
            style={index === rows.length - 1 ? [S.streamRow, { borderBottomWidth: 0 }] : S.streamRow}
          >
            <Text style={[S.streamCell, { width: 20 }]}>{index + 1}.</Text>
            <Text style={[S.streamCell, { flex: 1.2 }]}>{row?.streamNo || row?.description || ''}</Text>
            <Text style={[S.streamCell, { flex: 1.1, textAlign: 'right' }]}>{row ? fmt(row.flowrate, 1) : ''}</Text>
          </View>
        ))}
        <View style={[S.streamTableHead, { borderBottomWidth: 0 }]}>
          <Text style={[S.streamHeadCell, { width: 20 }]} />
          <Text style={[S.streamHeadCell, { flex: 1.2 }]}>TOTAL</Text>
          <Text style={[S.streamHeadCell, { flex: 1.1, textAlign: 'right' }]}>{fmt(total, 1)}</Text>
        </View>
      </View>
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
        <Text style={{ fontSize: 5.5, color: WHITE }}>CAL-PR-1050.0201</Text>
        <Text style={{ fontSize: 5.5, color: WHITE }}>VALIDATION REPORT : {VALIDATION_REPORT}</Text>
      </View>
    </View>
  )
}

interface ReportProps {
  input: CalculationInput
  result: CalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}

export function CalculationReport({
  input,
  result,
  metadata,
  revisions,
}: ReportProps) {
  const { derived, normalVenting, emergencyVenting, drainInbreathing, warnings } = result
  const incomingTotal = input.incomingStreams.reduce((sum, stream) => sum + stream.flowrate, 0)
  const outgoingTotal = input.outgoingStreams.reduce((sum, stream) => sum + stream.flowrate, 0)
  const noteLines = [
    warnings.capacityExceedsTable ? 'Tank capacity exceeds 30,000 m3; outside normal vent table range.' : null,
    warnings.undergroundTank ? 'Underground tank: environmental factor F = 0.' : null,
    warnings.hexaneDefaults ? 'Hexane defaults used where fluid data is incomplete.' : null,
    warnings.volatileLiquid ? 'Volatile liquid warning per selected API edition.' : null,
  ].filter(Boolean)

  return (
    <Document title={`Venting Calculation - ${input.tankNumber || 'report'}`}>
      <Page size="A4" style={S.page}>
        <View style={S.pageOuterFrame} fixed />
        <View style={S.disclaimerWrap} fixed>
          <Text style={S.disclaimerText}>
            This document is confidential proprietary and/or legally privileged, intended to be used within GCME Co.,Ltd. Unintended recipients are not allowed to distribute, copy, modify, retransmit, disseminate or use this document and/or information.
          </Text>
        </View>
        <View style={S.outerBorder}>
          <View style={S.topHeader}>
            <Text style={S.topHeaderTitle}>ATMOSPHERIC AND LOW PRESSURE STORAGE TANK VENTING CALCULATION</Text>
            <Text style={S.topHeaderCode}>VENTING</Text>
          </View>

          <View style={S.idRow}>
            <View style={S.idCell}>
              <Text style={S.idLabel}>TANK NO.</Text>
              <View style={S.idValueWrap}>
                <View style={S.idValueBox}>
                  <Text style={S.idValueText}>{str(input.tankNumber)}</Text>
                </View>
              </View>
            </View>
            <View style={S.idCell}>
              <Text style={S.idLabel}>DESCRIPTION.</Text>
              <View style={S.idValueWrap}>
                <View style={S.idValueBox}>
                  <Text style={S.idValueText}>{str(input.description)}</Text>
                </View>
              </View>
            </View>
            <View style={S.clearCell}>
              <Text style={S.clearText}>Clear Data</Text>
            </View>
          </View>

          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionHeaderText}>I. INPUT</Text>
            </View>
            <View style={S.sectionBody}>
              <View style={S.twoCol}>
                <View style={S.col}>
                  <DataRow label="Tank Diameter" value={fmt(input.diameter, 0)} unit="mm" />
                  <DataRow label="Tank Height (T.T.-T.L.)" value={fmt(input.height, 0)} unit="mm" />
                  <DataRow label="Max. Tank Volume" value={fmt(derived.maxTankVolume, 1)} unit="m3" />
                  <DataRow label="Surface Area" value={fmt(derived.totalSurfaceArea, 1)} unit="m2" />
                  <DataRow label="Wetted Area for Emergency case" value={fmt(derived.wettedArea, 1)} unit="m2" />
                  <DataRow label="Tank Location (latitude)" value={fmt(input.latitude, 1)} unit="°" />
                  <DataRow label="Design Pressure" value={fmt(input.designPressure, 1)} unit="kPag" />
                </View>
                <View style={S.col}>
                  <DataRow label="Avg. Storage Temperature" value={fmt(input.avgStorageTemp, 1)} unit="°C" />
                  <DataRow label="Vapour Pressure" value={fmt(input.vapourPressure, 1)} unit="kPa" />
                  <DataRow label="Flash Point or Boiling Point" value={fmt(input.flashBoilingPoint, 1)} unit="°C" />
                  <DataRow label="Latent Heat" value={fmt(input.latentHeat, 1)} unit="kJ/kg" />
                  <DataRow label="Relieving Temperature" value={fmt(input.relievingTemperature, 1)} unit="°C" />
                  <DataRow label="Molecular mass of vapor" value={fmt(input.molecularMass, 2)} unit="g/mol" />
                  <DataRow label="Drain line size" value={fmt(input.drainLineSize, 0)} unit="mm" />
                  <DataRow label="Maximum height above the drain line" value={fmt(input.maxHeightAboveDrain, 0)} unit="mm" />
                </View>
              </View>

              <View style={{ marginTop: 6 }}>
                <DataRow label="Tank Design / Configuration" value={str(input.tankConfiguration)} />
              </View>

              <View style={S.calcGrid}>
                <StreamTable title="Incoming Streams" streams={input.incomingStreams} total={incomingTotal} />
                <StreamTable title="Outgoing Streams" streams={input.outgoingStreams} total={outgoingTotal} />
              </View>
            </View>
          </View>

          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionHeaderText}>II. CALCULATION</Text>
            </View>
            <View style={S.sectionBody}>
              <View style={S.calcGrid}>
                <View style={S.calcBlock}>
                  <Text style={S.calcSubTitle}>NORMAL VENTING</Text>
                  <DataRow label="Calculation Method" value={`API 2000 ${result.apiEdition} EDITION`} />

                  <Text style={[S.calcSubTitle, { marginTop: 5 }]}>OUT-BREATHING</Text>
                  <DataRow label="Out-breathing Vol. Flowrate" value={fmt(normalVenting.outbreathing.processFlowrate, 1)} unit="Nm3/h" />
                  <DataRow label="Thermal out-breathing" value={fmt(normalVenting.outbreathing.thermalOutbreathing, 1)} unit="Nm3/h" />
                  <DataRow label="Y-factor" value={fmt(normalVenting.outbreathing.yFactor, 3)} />
                  <DataRow label="Reduction factor" value={fmt(normalVenting.outbreathing.reductionFactor, 3)} />
                  <DataRow label="Total normal out-breathing" value={fmt(normalVenting.outbreathing.total, 1)} unit="Nm3/h" />
                </View>

                <View style={S.calcBlock}>
                  <Text style={[S.calcSubTitle, { marginTop: 16 }]}>IN-BREATHING</Text>
                  <DataRow label="In-breathing Vol. Flowrate" value={fmt(normalVenting.inbreathing.processFlowrate, 1)} unit="Nm3/h" />
                  <DataRow label="Thermal in-breathing" value={fmt(normalVenting.inbreathing.thermalInbreathing, 1)} unit="Nm3/h" />
                  <DataRow label="C-factor" value={fmt(normalVenting.inbreathing.cFactor, 3)} />
                  <DataRow label="Reduction factor" value={fmt(normalVenting.inbreathing.reductionFactor, 3)} />
                  <DataRow label="Total normal in-breathing" value={fmt(normalVenting.inbreathing.total, 1)} unit="Nm3/h" />
                </View>
              </View>

              <View style={[S.calcGrid, { marginTop: 6 }]}>
                <View style={S.calcBlock}>
                  <Text style={S.calcSubTitle}>EMERGENCY VENTING</Text>
                  <DataRow label="Heat input from Fire Exposure, Q" value={fmt(emergencyVenting.heatInput, 0)} unit="W" />
                  <DataRow label="Environmental factor, F" value={fmt(emergencyVenting.environmentalFactor, 3)} />
                  <DataRow label="Emergency Venting required for Fire Exposure" value={fmt(emergencyVenting.emergencyVentRequired, 1)} unit="Nm3/h of Air" />
                </View>
                <View style={S.calcBlock}>
                  <Text style={S.calcSubTitle}>DRAIN SYSTEM</Text>
                  <DataRow label="Inbreathing requirement due to draining" value={fmt(drainInbreathing, 1)} unit="Nm3/h" />
                </View>
              </View>
            </View>
          </View>

          <View style={S.noteArea}>
            <Text style={S.noteLabel}>NOTE'S:</Text>
            {noteLines.map((line, index) => (
              <Text key={index} style={{ marginTop: 4, fontSize: 6, color: GUIDE }}>
                {line}
              </Text>
            ))}
          </View>

          <TitleBlock metadata={metadata} revisions={revisions} />
        </View>
      </Page>
    </Document>
  )
}
