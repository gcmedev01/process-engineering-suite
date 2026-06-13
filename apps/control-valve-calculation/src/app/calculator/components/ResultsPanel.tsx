"use client"

import { SectionCard } from "./SectionCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import type { CaseResult, CalculationResult, EngineWarning, ValidationIssue } from "@/types"

interface Props {
  calculationResult: CalculationResult | null
  validationIssues: ValidationIssue[] | null
}

const fmt = (v: number | null, digits = 2): string =>
  v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits)

export function ResultsPanel({ calculationResult, validationIssues }: Props) {
  if (!calculationResult) {
    if (validationIssues && validationIssues.length > 0) {
      return <ValidationIssuesCard issues={validationIssues} />
    }
    return <EmptyState />
  }

  const { cases, governingCaseName, CvMax } = calculationResult

  return (
    <div className="space-y-4">
      <SectionCard title="Sizing Summary">
        <div className="grid grid-cols-2 gap-4">
          <Kpi label="Governing case" value={governingCaseName ?? "—"} />
          <Kpi label="Required Cv (max)" value={fmt(CvMax)} mono />
        </div>
        <Separator />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-2">Case</th>
                <th className="py-1 px-2 text-right">Cv</th>
                <th className="py-1 px-2 text-right">Kv</th>
                <th className="py-1 px-2 text-right">Fp</th>
                <th className="py-1 px-2 text-right">Fr</th>
                <th className="py-1 px-2 text-right">Y</th>
                <th className="py-1 px-2 text-right">ΔP sizing</th>
                <th className="py-1 px-2 text-center">OK</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {cases.map((c) => (
                <tr key={c.caseName + (c.label ?? "")} className="border-t">
                  <td className="py-1 pr-2 font-sans">{c.label ?? c.caseName}</td>
                  <td className="py-1 px-2 text-right">{fmt(c.CvRequired)}</td>
                  <td className="py-1 px-2 text-right">{fmt(c.KvRequired)}</td>
                  <td className="py-1 px-2 text-right">{fmt(c.Fp, 3)}</td>
                  <td className="py-1 px-2 text-right">{fmt(c.Fr, 3)}</td>
                  <td className="py-1 px-2 text-right">{fmt(c.Y, 3)}</td>
                  <td className="py-1 px-2 text-right">{fmt(c.dPSizing)}</td>
                  <td className="py-1 px-2 text-center">
                    {c.converged && c.CvRequired != null ? (
                      <CheckCircle2 className="inline h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <AlertCircle className="inline h-3.5 w-3.5 text-destructive" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {cases.map((c) => (
        <CaseDetailCard key={"detail-" + c.caseName + (c.label ?? "")} c={c} />
      ))}
    </div>
  )
}

function Kpi({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${mono ? "font-mono tabular-nums" : ""}`}>{value}</p>
    </div>
  )
}

function CaseDetailCard({ c }: { c: CaseResult }) {
  const rows: [string, string][] = [
    ["x (actual)", fmt(c.xActual, 3)],
    ["x (sizing)", fmt(c.xSizing, 3)],
    ["x limit", fmt(c.xLimit, 3)],
    ["FLP", fmt(c.FLP, 3)],
    ["xTP", fmt(c.xTP, 3)],
    ["Rev", fmt(c.Rev, 0)],
    ["σ (cavitation)", fmt(c.sigma, 2)],
    ["Travel %", fmt(c.calculatedTravelPercent, 1)],
    ["Outlet velocity (m/s)", fmt(c.outletVelocity, 2)],
    ["Mach", fmt(c.mach, 3)],
    ["Iterations", String(c.iterations)],
  ]
  return (
    <SectionCard title={`Case: ${c.label ?? c.caseName}`}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-dashed py-0.5">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-mono tabular-nums">{v}</span>
          </div>
        ))}
      </div>
      {c.assumptions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {c.assumptions.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {a}
            </li>
          ))}
        </ul>
      )}
      {c.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {c.warnings.map((w, i) => (
            <WarningRow key={i} w={w} />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function WarningRow({ w }: { w: EngineWarning }) {
  const Icon = w.severity === "error" ? AlertCircle : w.severity === "warning" ? AlertTriangle : Info
  const color =
    w.severity === "error"
      ? "text-destructive"
      : w.severity === "warning"
        ? "text-orange-500"
        : "text-muted-foreground"
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${color}`} />
      <span className={color}>{w.message}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Results</CardTitle>
        <Separator />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Enter valve configuration, fluid properties, and at least one operating case to size the
          valve.
        </p>
      </CardContent>
    </Card>
  )
}

export function ValidationIssuesCard({ issues }: { issues: ValidationIssue[] }) {
  return (
    <Card className="shadow-sm border-orange-300/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Results</CardTitle>
          <Badge variant="outline" className="text-xs text-orange-600">
            {issues.length} validation {issues.length !== 1 ? "issues" : "issue"}
          </Badge>
        </div>
        <Separator />
      </CardHeader>
      <CardContent className="space-y-1.5 pt-1">
        <p className="text-xs text-muted-foreground mb-3">Fix the following to generate results:</p>
        {issues.map((issue, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium leading-tight">{issue.message}</p>
              {issue.field && (
                <p className="text-xs text-muted-foreground/70 leading-tight mt-0.5">
                  Field: {issue.field}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
