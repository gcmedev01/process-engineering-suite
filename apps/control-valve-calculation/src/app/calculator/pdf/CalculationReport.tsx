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
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { convertUnit } from '@eng-suite/physics'
import { GCME_LIGHT_LOGO_DATA_URI, GCME_LIGHT_LOGO_ASPECT } from '@eng-suite/ui-kit'
import { CV_BASE_UNITS, UOM_LABEL, type CvUomCategory } from '@/lib/uom'
import type {
  CalculationInput,
  CalculationMetadata,
  CalculationResult,
  FlowMode,
  RevisionRecord,
} from '@/types'

export interface CalculationReportProps {
  input: CalculationInput
  result: CalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
  /** Per-category display-unit preferences (from the UoM store). */
  units: Record<string, string>
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
const VALIDATION_REPORT = 'RPT-PR-XXXX-XXXX'
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

// ─── Unit helpers ──────────────────────────────────────────────────────────────
// Form/engine values are stored in base units (CV_BASE_UNITS). The report
// converts each value into the user's chosen display unit and labels it.

function unitLabel(category: CvUomCategory, units: Record<string, string>): string {
  const u = units[category] ?? CV_BASE_UNITS[category]
  return UOM_LABEL[u] ?? u
}

function fmtNum(v: number | null | undefined, digits = 3): string {
  if (v == null || !isFinite(v)) return '—'
  return Math.abs(v) >= 100 ? v.toFixed(Math.min(digits, 2)) : v.toFixed(digits)
}

/** Convert a base-unit value into the display unit and format it. */
function dispVal(
  base: number | null | undefined,
  category: CvUomCategory,
  units: Record<string, string>,
  digits = 3,
): string {
  if (base == null || !isFinite(base)) return '—'
  const u = units[category] ?? CV_BASE_UNITS[category]
  return fmtNum(convertUnit(base, CV_BASE_UNITS[category], u), digits)
}

function flowCategory(mode: FlowMode): CvUomCategory {
  if (mode === 'mass') return 'massFlow'
  if (mode === 'volumetric_standard') return 'ventRate'
  return 'volumeFlow'
}

const VALVE_TYPE_LABEL: Record<string, string> = {
  globe: 'Globe', globe_angle: 'Globe (angle)', ball: 'Ball', butterfly: 'Butterfly',
  rotary_plug: 'Rotary plug', special: 'Special',
}
const FLOW_CHAR_LABEL: Record<string, string> = {
  linear: 'Linear', equal_percentage: 'Equal percentage', quick_opening: 'Quick opening',
}
const FLUID_LABEL: Record<string, string> = {
  liquid: 'Liquid', gas: 'Gas', vapor: 'Vapor', steam: 'Steam',
  two_phase: 'Two-phase', slurry: 'Slurry', non_newtonian: 'Non-Newtonian',
}
const FLOW_MODE_LABEL: Record<string, string> = {
  volumetric_standard: 'Volumetric (standard)', volumetric_actual: 'Volumetric (actual)', mass: 'Mass',
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
          <View style={{ width: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: BW, borderRightColor: BLACK, backgroundColor: WHITE, padding: 4 }}>
            <Image src={GCME_LIGHT_LOGO_DATA_URI} style={{ width: 36, height: 36 / GCME_LIGHT_LOGO_ASPECT }} />
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
        <Text style={{ fontSize: 5.5, color: WHITE }}>VALIDATION REPORT : {VALIDATION_REPORT}</Text>
      </View>
    </View>
  )
}

// ─── Per-case results table (replaces the sketch area) ──────────────────────────

function CaseTable({
  input,
  result,
  units,
}: {
  input: CalculationInput
  result: CalculationResult
  units: Record<string, string>
}) {
  const dpUnit = unitLabel('absolutePressure', units)
  const cols = [
    { key: 'case', label: 'CASE', flex: 1.4 },
    { key: 'cv', label: 'Cv', flex: 1 },
    { key: 'kv', label: 'Kv', flex: 1 },
    { key: 'fp', label: 'Fp', flex: 1 },
    { key: 'fr', label: 'Fr', flex: 1 },
    { key: 'y', label: 'Y', flex: 1 },
    { key: 'x', label: 'x (sizing)', flex: 1.1 },
    { key: 'rev', label: 'Rev', flex: 1.1 },
    { key: 'dp', label: `ΔP sizing (${dpUnit})`, flex: 1.5 },
    { key: 'ok', label: 'OK', flex: 0.7 },
  ]
  const cellBase = {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRightWidth: BW,
    borderRightColor: '#d1d5db',
    fontSize: 6,
  }
  return (
    <View style={S.sketchSection}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionHeaderText}>V. OPERATING CASES</Text>
      </View>
      {/* header */}
      <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: BW, borderBottomColor: BLACK }}>
        {cols.map((c, i) => (
          <View key={c.key} style={{ ...cellBase, flex: c.flex, borderRightWidth: i === cols.length - 1 ? 0 : BW }}>
            <Text style={{ fontSize: 5.6, fontFamily: 'Helvetica-Bold', color: GUIDE, textAlign: c.key === 'case' ? 'left' : 'right' }}>
              {c.label}
            </Text>
          </View>
        ))}
      </View>
      {result.cases.map((rc, idx) => {
        const ic = input.cases[idx]
        const cells = [
          { key: 'case', v: present(rc.label ?? rc.caseName), align: 'left' as const },
          { key: 'cv', v: fmtNum(rc.CvRequired), align: 'right' as const },
          { key: 'kv', v: fmtNum(rc.KvRequired), align: 'right' as const },
          { key: 'fp', v: fmtNum(rc.Fp), align: 'right' as const },
          { key: 'fr', v: fmtNum(rc.Fr), align: 'right' as const },
          { key: 'y', v: fmtNum(rc.Y), align: 'right' as const },
          { key: 'x', v: fmtNum(rc.xSizing), align: 'right' as const },
          { key: 'rev', v: fmtNum(rc.Rev, 0), align: 'right' as const },
          { key: 'dp', v: dispVal(rc.dPSizing, 'absolutePressure', units, 2), align: 'right' as const },
          { key: 'ok', v: rc.converged && rc.CvRequired != null ? 'Y' : 'N', align: 'right' as const },
        ]
        const isGov = rc.caseName === result.governingCaseName
        return (
          <View key={idx} style={{ flexDirection: 'row', borderBottomWidth: BW, borderBottomColor: '#e5e7eb', backgroundColor: isGov ? VALUE_BG : WHITE }}>
            {cols.map((col, i) => {
              const cell = cells.find((x) => x.key === col.key)!
              return (
                <View key={col.key} style={{ ...cellBase, flex: col.flex, borderRightWidth: i === cols.length - 1 ? 0 : BW }}>
                  <Text style={{ fontSize: 6, textAlign: cell.align, fontFamily: col.key === 'cv' ? 'Helvetica-Bold' : 'Helvetica' }}>
                    {cell.v}
                  </Text>
                </View>
              )
            })}
          </View>
        )
      })}
      {/* Operating-case inputs for the governing case */}
      <View style={{ paddingHorizontal: 5, paddingTop: 4 }}>
        <Text style={{ fontSize: 5.6, color: MUTED }}>
          Highlighted row = governing case. Cv/Kv are flow coefficients (dimensionless); Fp, Fr, Y,
          and x (sizing) are correction/ratio factors.
        </Text>
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
  units,
}: CalculationReportProps) {
  const tag = present(input.tag)
  const govIdx = Math.max(0, result.cases.findIndex((c) => c.caseName === result.governingCaseName))
  const governing = result.cases[govIdx] ?? result.cases[0] ?? null
  const govInput = input.cases[govIdx] ?? input.cases[0] ?? null
  const fluid = input.fluid
  const valve = input.valve
  const isLiquid = fluid.fluidType === 'liquid'
  const flowCat = govInput ? flowCategory(govInput.flowMode) : 'volumeFlow'

  return (
    <Document title={`Control Valve Sizing — ${tag}`}>
      <Page size="A4" style={S.page}>
        <View style={S.pageOuterFrame} fixed />
        <View style={S.disclaimerWrap} fixed>
          <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
        </View>

        <View style={S.outerBorder}>
          {/* ── Top header bar ── */}
          <View style={S.topHeader}>
            <Text style={S.topHeaderTitle}>Control Valve Sizing Report</Text>
            <Text style={S.topHeaderCode}>{DOCUMENT_CODE}</Text>
          </View>

          {/* ── Type row ── */}
          <View style={S.typeRow}>
            <View style={S.typeLabel}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: GUIDE }}>TAG</Text>
            </View>
            <View style={S.typeValue}>
              <Text>{tag} — {present(input.description)}</Text>
            </View>
          </View>

          {/* ── Body: inputs left, outputs right ── */}
          <View style={S.bodyRow}>
            <View style={S.leftCol}>
              <Section title="I. VALVE CONFIGURATION">
                <DataRow label="Valve type" value={VALVE_TYPE_LABEL[valve.valveType] ?? valve.valveType} />
                <DataRow label="Flow characteristic" value={FLOW_CHAR_LABEL[valve.flowCharacteristic] ?? valve.flowCharacteristic} />
                <DataRow label="Reporting basis" value={valve.flowBasis} />
                <DataRow label="Valve size (nominal bore)" value={dispVal(valve.valveSize, 'length', units)} unit={unitLabel('length', units)} />
                <DataRow label="Upstream line size" value={dispVal(valve.lineSizeUpstream, 'length', units)} unit={unitLabel('length', units)} />
                <DataRow label="Downstream line size" value={dispVal(valve.lineSizeDownstream, 'length', units)} unit={unitLabel('length', units)} />
                <DataRow label="Inline fittings" value={present(valve.fittings)} />
                <DataRow label="Liquid pressure-recovery factor (FL)" value={fmtNum(valve.FL)} />
                <DataRow label="Terminal pressure-drop ratio (xT)" value={fmtNum(valve.xT)} />
                <DataRow label="Valve style modifier (Fd)" value={fmtNum(valve.Fd)} />
              </Section>

              <Section title="II. FLUID & OPERATING CASE">
                <DataRow label="Fluid type" value={FLUID_LABEL[fluid.fluidType] ?? fluid.fluidType} />
                {isLiquid ? (
                  <>
                    <DataRow label="Specific gravity (Gf)" value={fmtNum(fluid.Gf)} />
                    <DataRow label="Vapour pressure, abs (Pv)" value={dispVal(fluid.Pv, 'pressure', units, 2)} unit={unitLabel('pressure', units)} />
                    <DataRow label="Critical pressure, abs (Pc)" value={dispVal(fluid.Pc, 'pressure', units, 1)} unit={unitLabel('pressure', units)} />
                    <DataRow label="Kinematic viscosity (ν)" value={dispVal(fluid.kinematicViscosity, 'kinematicViscosity', units, 3)} unit={unitLabel('kinematicViscosity', units)} />
                  </>
                ) : (
                  <>
                    <DataRow label="Molecular weight (M)" value={fmtNum(fluid.M, 2)} unit="kg/kmol" />
                    <DataRow label="Ratio of specific heats (k)" value={fmtNum(fluid.k)} />
                    <DataRow label="Compressibility (Z)" value={fmtNum(fluid.Z)} />
                  </>
                )}
                <DataRow label="Upstream density (ρ1)" value={dispVal(fluid.upstreamDensity, 'density', units, 2)} unit={unitLabel('density', units)} />
                <DataRow label="Governing flow mode" value={govInput ? (FLOW_MODE_LABEL[govInput.flowMode] ?? govInput.flowMode) : '—'} />
                <DataRow label="Flow rate" value={govInput ? dispVal(govInput.flowRate, flowCat, units, 2) : '—'} unit={unitLabel(flowCat, units)} />
                <DataRow label="Inlet pressure, abs (P1)" value={govInput ? dispVal(govInput.P1, 'pressure', units, 2) : '—'} unit={unitLabel('pressure', units)} />
                <DataRow label="Outlet pressure, abs (P2)" value={govInput?.P2 != null ? dispVal(govInput.P2, 'pressure', units, 2) : '—'} unit={unitLabel('pressure', units)} />
                <DataRow label="Pressure drop (ΔP)" value={govInput?.dP != null ? dispVal(govInput.dP, 'absolutePressure', units, 2) : '—'} unit={unitLabel('absolutePressure', units)} />
                <DataRow label="Inlet temperature (T1)" value={govInput ? dispVal(govInput.T1, 'temperature', units, 1) : '—'} unit={unitLabel('temperature', units)} />
              </Section>
            </View>

            <View style={S.rightCol}>
              <Section title="III. SIZING RESULT (GOVERNING CASE)">
                <DataRow label="Calculation status" value={present(result.status)} />
                <DataRow label="Governing case" value={present(result.governingCaseName)} />
                <DataRow label="Required flow coefficient (Cv)" value={fmtNum(result.CvMax)} highlight />
                <DataRow label="Required flow coefficient (Kv)" value={fmtNum(governing?.KvRequired ?? null)} />
              </Section>

              <Section title="IV. GOVERNING CASE DETAIL">
                <DataRow label="Piping geometry factor (Fp)" value={fmtNum(governing?.Fp ?? null)} />
                <DataRow label="Reynolds factor (Fr)" value={fmtNum(governing?.Fr ?? null)} />
                <DataRow label="Combined recovery factor (FLP)" value={fmtNum(governing?.FLP ?? null)} />
                <DataRow label="Combined terminal ratio (xTP)" value={fmtNum(governing?.xTP ?? null)} />
                <DataRow label="Expansion factor (Y)" value={fmtNum(governing?.Y ?? null)} />
                <DataRow label="Pressure-drop ratio, actual (x)" value={fmtNum(governing?.xActual ?? null)} />
                <DataRow label="Pressure-drop ratio, sizing" value={fmtNum(governing?.xSizing ?? null)} />
                <DataRow label="Sizing pressure drop (ΔP)" value={dispVal(governing?.dPSizing ?? null, 'absolutePressure', units, 2)} unit={unitLabel('absolutePressure', units)} />
                <DataRow label="Choked pressure drop (ΔP)" value={dispVal(governing?.dPChoked ?? null, 'absolutePressure', units, 2)} unit={unitLabel('absolutePressure', units)} />
                <DataRow label="Valve Reynolds number (Rev)" value={fmtNum(governing?.Rev ?? null, 0)} />
                <DataRow label="Cavitation index (σ)" value={fmtNum(governing?.sigma ?? null, 2)} />
                <DataRow label="Calculated travel" value={fmtNum(governing?.calculatedTravelPercent ?? null, 1)} unit="%" />
                <DataRow label="Outlet velocity" value={fmtNum(governing?.outletVelocity ?? null, 2)} unit="m/s" />
                <DataRow label="Mach number" value={fmtNum(governing?.mach ?? null, 3)} />
                <DataRow label="Converged" value={governing ? (governing.converged ? 'Yes' : 'No') : '—'} />
              </Section>
            </View>
          </View>

          {/* ── Per-case results table (spans both columns) ── */}
          <CaseTable input={input} result={result} units={units} />

          {/* ── Title block (bottom) ── */}
          <TitleBlock metadata={metadata} revisions={revisions} />
        </View>
      </Page>
    </Document>
  )
}
