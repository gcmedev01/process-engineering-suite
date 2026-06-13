/**
 * Engine entry point — orchestrates sizing over all operating cases (spec §7).
 * Contract matches the template's useCalculation hook:
 *   computeResult(input) -> { result, derivedGeometry, issues }
 */
import type {
  CalculationInput,
  CalculationResult,
  CaseResult,
  DerivedGeometry,
  ValidationIssue,
} from "@/types"
import { CalculationStatus } from "@/types"
import { sizeCase } from "./sizeCase"
import { makeWarning } from "./warnings"

const SUPPRESSED = new Set(["two_phase", "slurry", "non_newtonian"])

function suppressedCase(caseName: string, label?: string): CaseResult {
  const warn = makeWarning("WARN_TWO_PHASE")
  return {
    caseName,
    label,
    CvRequired: null,
    KvRequired: null,
    dPActual: 0,
    dPSizing: 0,
    dPChoked: null,
    xActual: null,
    xSizing: null,
    xLimit: null,
    Y: null,
    Fp: 1,
    Fr: 1,
    FLP: null,
    xTP: null,
    Rev: null,
    sigma: null,
    calculatedTravelPercent: null,
    outletVelocity: null,
    mach: null,
    warnings: [warn],
    assumptions: [],
    iterations: 0,
    converged: false,
  }
}

export function computeResult(input: CalculationInput): {
  result: CalculationResult | null
  derivedGeometry: DerivedGeometry
  issues: ValidationIssue[]
} {
  const cases: CaseResult[] = []

  if (SUPPRESSED.has(input.fluid.fluidType)) {
    // Intercept: never present two-phase/slurry/non-Newtonian as standard sizing.
    for (const oc of input.cases) {
      cases.push(suppressedCase(oc.caseName, oc.label))
    }
  } else {
    for (const oc of input.cases) {
      cases.push(sizeCase(oc, input.valve, input.fluid))
    }
  }

  // Governing case = largest finite CvRequired.
  let governingCaseName: string | null = null
  let CvMax: number | null = null
  for (const c of cases) {
    if (c.CvRequired != null && Number.isFinite(c.CvRequired)) {
      if (CvMax == null || c.CvRequired > CvMax) {
        CvMax = c.CvRequired
        governingCaseName = c.caseName
      }
    }
  }

  // Surface error-severity warnings (and failed cases) as validation issues.
  const issues: ValidationIssue[] = []
  let hasError = false
  let hasWarning = false
  for (const c of cases) {
    for (const w of c.warnings) {
      if (w.severity === "error") {
        hasError = true
        issues.push({ code: w.code, message: `[${c.caseName}] ${w.message}`, severity: "error" })
      } else if (w.severity === "warning") {
        hasWarning = true
      }
    }
    if (c.CvRequired == null) hasError = true
  }

  const status = hasError
    ? CalculationStatus.ERROR
    : hasWarning
      ? CalculationStatus.WARNING
      : CalculationStatus.SUCCESS

  const result: CalculationResult = { status, cases, governingCaseName, CvMax }
  const derivedGeometry: DerivedGeometry = { ready: cases.length > 0 }
  return { result, derivedGeometry, issues }
}
