// ─── Shared template types (kept stable for the useCalculation hook + persistence) ───

export interface CalculationMetadata {
  projectNumber: string
  documentNumber: string
  title: string
  projectName: string
  client: string
}

export interface RevisionRecord {
  rev: string
  by: string
  byDate?: string
  checkedBy: string
  checkedDate?: string
  approvedBy: string
  approvedDate?: string
}

export enum CalculationStatus {
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
}

export interface ValidationIssue {
  code: string
  message: string
  severity: "error" | "warning" | "info"
  field?: string
}

/** Minimal geometry/preview payload surfaced to the UI (kept for hook compatibility). */
export interface DerivedGeometry {
  ready: boolean
}

// ─── Control-valve domain types (spec §4) ───

export type FluidType =
  | "liquid"
  | "gas"
  | "vapor"
  | "steam"
  | "two_phase"
  | "slurry"
  | "non_newtonian"

export type CaseName = "min" | "normal" | "max" | "design" | "custom"
export type FlowMode = "volumetric_standard" | "volumetric_actual" | "mass"
export type ValveType = "globe" | "globe_angle" | "ball" | "butterfly" | "rotary_plug" | "special"
export type FittingKind = "none" | "reducers" | "expanders" | "custom"
export type UnitSystem = "US" | "metric_bar" | "metric_kpa"
export type PressureBasis = "absolute" | "gauge"
export type FlowCharacteristic = "linear" | "equal_percentage" | "quick_opening"

/** Warning codes — see warnings.ts for the exact human strings + severities. */
export type WarnCode =
  | "WARN_GAUGE"
  | "WARN_DP_NONPOS"
  | "WARN_LIQ_CHOKED"
  | "WARN_GAS_CHOKED"
  | "WARN_FLASHING"
  | "WARN_CAVITATION"
  | "WARN_VISCOUS"
  | "WARN_FITTINGS"
  | "WARN_FP_NOCONV"
  | "WARN_FR_NOCONV"
  | "WARN_OVERSIZED"
  | "WARN_NEAR_OPEN"
  | "WARN_UNDERSIZED"
  | "WARN_VELOCITY"
  | "WARN_NOISE"
  | "WARN_STEAM"
  | "WARN_TWO_PHASE"
  | "WARN_Z_DEFAULTED"

export interface EngineWarning {
  code: WarnCode
  message: string
  severity: "error" | "warning" | "info"
}

/** Shared across all cases for one valve sizing run. */
export interface ValveConfig {
  unitSystem: UnitSystem
  valveType: ValveType
  flowCharacteristic: FlowCharacteristic
  valveSize: number // nominal valve bore d (base mm)
  lineSizeUpstream: number // D1 (base mm)
  lineSizeDownstream: number // D2 (base mm)
  fittings: FittingKind
  // Valve coefficients — if omitted, fall back to defaults.ts by valveType (push assumption)
  FL?: number
  xT?: number
  Fd?: number
  flowBasis: "Cv" | "Kv" // reporting basis; internal math always Cv
  // Optional manufacturer curve for travel checks
  cvCurve?: { travelPercent: number; cv: number }[]
}

export interface FluidProps {
  fluidType: FluidType
  // liquid
  Gf?: number // specific gravity at flowing temp
  Pv?: number // vapor pressure (absolute, base kPa)
  Pc?: number // thermodynamic critical pressure (absolute, base kPa)
  kinematicViscosity?: number // base cSt (= mm²/s)
  // gas/vapor
  M?: number // molecular weight (kg/kmol)
  Z?: number // compressibility at inlet
  k?: number // ratio of specific heats Cp/Cv
  upstreamDensity?: number // ρ1 at P1,T1 (base kg/m3) — required for mass / actual-vol
}

export interface OperatingCase {
  caseName: CaseName
  label?: string
  flowMode: FlowMode
  flowRate: number // base units: volumetric m3/h, standard Nm3/h, mass kg/h
  P1: number // base kPa (gauge or absolute per basis)
  P1Basis: PressureBasis
  P2?: number // downstream pressure (one of P2 / dP required)
  P2Basis?: PressureBasis
  dP?: number // pressure difference (base kPa) — alternative to P2
  T1: number // base °C
  pAtm?: number // atmospheric pressure for gauge→abs (default 101.325 kPa)
}

export interface CalculationInput {
  tag: string
  description?: string
  metadata: CalculationMetadata
  valve: ValveConfig
  fluid: FluidProps
  cases: OperatingCase[]
}

/** AGENTS.md output schema + engine bookkeeping. One per case. */
export interface CaseResult {
  caseName: string
  label?: string
  CvRequired: number | null
  KvRequired: number | null
  dPActual: number
  dPSizing: number
  dPChoked: number | null
  xActual: number | null
  xSizing: number | null
  xLimit: number | null
  Y: number | null
  Fp: number
  Fr: number
  FLP: number | null
  xTP: number | null
  Rev: number | null
  sigma: number | null
  calculatedTravelPercent: number | null
  outletVelocity: number | null // m/s
  mach: number | null
  warnings: EngineWarning[]
  assumptions: string[]
  iterations: number
  converged: boolean
}

export interface CalculationResult {
  status: CalculationStatus
  cases: CaseResult[]
  governingCaseName: string | null
  CvMax: number | null
}
