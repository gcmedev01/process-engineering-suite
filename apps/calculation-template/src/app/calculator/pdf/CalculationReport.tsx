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

const NAVY = '#1f3864'
const BLACK = '#000000'
const ROW_ALT = '#E7EFF6'
const SECTION_HEADER_BG = '#D9E1F2'
const DOCUMENT_CODE = 'CA-PR-1050-0101'

const DISCLAIMER =
  'This document is confidential proprietary and/or legally privileged, intended to be used within GCME Co.,Ltd. Unintended recipients are not allowed to distribute, copy, modify, retransmit, disseminate or use this document and/or information.'

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 0,
    color: '#0f172a',
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
    borderWidth: 1,
    borderColor: BLACK,
    padding: 24,
  },
  disclaimerWrap: {
    position: 'absolute',
    left: 7,
    top: 62,
    bottom: 74,
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  disclaimerText: {
    width: 800,
    fontSize: 5.6,
    color: '#7F7F7F',
    textAlign: 'center',
    transform: 'rotate(-90deg)',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    paddingBottom: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 9,
    color: '#64748b',
  },
  section: {
    marginTop: 11,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sectionHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sectionHeaderText: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  rowAlt: {
    backgroundColor: ROW_ALT,
  },
  label: {
    flex: 1,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 40,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#64748b',
    fontSize: 7,
  },
  footerDocCode: {
    color: '#21436D',
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },
})

function present(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim() || '—'
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '—'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return '—'
}

export function CalculationReport({
  input,
  result,
  metadata,
  revisions,
}: CalculationReportProps) {
  return (
    <Document title={`Calculation Report - ${input.tag || 'report'}`}>
      <Page size="A4" style={S.page}>
        <View style={S.pageOuterFrame} fixed />
        <View style={S.disclaimerWrap} fixed>
          <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
        </View>
        <View style={S.outerBorder}>
          <View style={S.header}>
            <Text style={S.title}>Calculation Report</Text>
            <Text style={S.subtitle}>
              Replace this template report with app-specific result sections and schematics.
            </Text>
          </View>

          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionHeaderText}>Metadata</Text>
            </View>
            {[
              { label: 'Tag', value: present(input.tag) },
              { label: 'Description', value: present(input.description) },
              { label: 'Project Number', value: present(metadata.projectNumber) },
              { label: 'Document Number', value: present(metadata.documentNumber) },
              { label: 'Title', value: present(metadata.title) },
              { label: 'Project Name', value: present(metadata.projectName) },
              { label: 'Client', value: present(metadata.client) },
              { label: 'Revision', value: present(revisions.at(-1)?.rev) },
              { label: 'Prepared By / Date', value: `${present(revisions.at(-1)?.by)} / ${present(revisions.at(-1)?.byDate)}` },
              { label: 'Checked By / Date', value: `${present(revisions.at(-1)?.checkedBy)} / ${present(revisions.at(-1)?.checkedDate)}` },
              { label: 'Approved By / Date', value: `${present(revisions.at(-1)?.approvedBy)} / ${present(revisions.at(-1)?.approvedDate)}` },
            ].map((row, i) => {
              const rowStyle = i % 2 === 1 ? S.rowAlt : {}
              return (
              <View
                key={row.label}
                style={[S.row, rowStyle]}
              >
                <Text style={S.label}>{row.label}</Text>
                <Text style={S.value}>{row.value}</Text>
              </View>
              )
            })}
          </View>

          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionHeaderText}>Result Summary</Text>
            </View>
            {[
              { label: 'Status', value: present(result.status) },
              { label: 'Revision Records', value: String(revisions.length) },
            ].map((row, i) => {
              const rowStyle = i % 2 === 1 ? S.rowAlt : {}
              return (
              <View
                key={row.label}
                style={[S.row, rowStyle]}
              >
                <Text style={S.label}>{row.label}</Text>
                <Text style={S.value}>{row.value}</Text>
              </View>
              )
            })}
          </View>
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footerDocCode}>{DOCUMENT_CODE}</Text>
          <Text>Calculation Report · Page 1</Text>
        </View>
      </Page>
    </Document>
  )
}