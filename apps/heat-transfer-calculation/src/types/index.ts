// ─── Metadata & Revisions ─────────────────────────────────────────────────────

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

// ─── Tank Configuration ───────────────────────────────────────────────────────

export enum TankRoofType {
  FLAT = "Flat Roof",
  CONE = "Cone Roof",
  DOME = "Dome Roof",
}

// ─── Calculation Input ────────────────────────────────────────────────────────

export interface CalculationInput {
  // Identification
  tag: string
  description?: string

  // Tank geometry (base units: mm)
  tankDiameter: number            // mm — internal diameter
  tankHeight: number              // mm — total shell height
  liquidLevel: number             // mm — height of liquid (0 = empty)

  // Tank roof
  tankRoofType?: TankRoofType
  roofHeight?: number             // mm — for cone/dome roof

  // Operating conditions (base units: °C, m/s)
  fluidTemp: number               // °C — bulk liquid temperature
  vaporTemp?: number              // °C — dry/vapor space bulk temperature; defaults to fluidTemp
  ambientTemp: number             // °C — ambient air temperature
  windSpeed: number               // m/s — average wind speed

  // Wall construction (base units: mm, W/(m·K))
  wallThickness: number           // mm — steel wall thickness
  wallConductivity: number        // W/(m·K) — wall material thermal conductivity
  insulationThickness: number     // mm — insulation layer thickness (0 = none)
  insulationConductivity: number  // W/(m·K) — insulation thermal conductivity

  // Fluid properties (base units)
  fluidDensity: number            // kg/m³
  fluidSpecificHeat: number       // J/(kg·K)
  fluidViscosity: number          // Pa·s — dynamic viscosity
  fluidThermalConductivity: number // W/(m·K)
  fluidExpansionCoeff: number     // 1/K — volumetric thermal expansion coefficient

  // Vapor/gas properties (for dry wall area above liquid level)
  // Falls back to air properties at fluidTemp if omitted
  vaporDensity?: number             // kg/m³
  vaporSpecificHeat?: number        // J/(kg·K)
  vaporViscosity?: number           // Pa·s
  vaporThermalConductivity?: number // W/(m·K)
  vaporExpansionCoeff?: number      // 1/K

  // Ground conditions (base units: °C, W/(m·K))
  groundTemp?: number               // °C — temperature at ground contact
  groundConductivity?: number       // W/(m·K) — default 1.3846 (concrete)

  // Fouling HTC equivalents (W/(m²·K))
  // Defaults are very high = effectively negligible
  foulingDryWall?: number           // W/(m²·K)
  foulingWetWall?: number           // W/(m²·K)
  foulingRoof?: number              // W/(m²·K)
  foulingFloor?: number             // W/(m²·K)

  // Wind enhancement factor — multiplier for external natural convection
  windEnhancement?: number          // dimensionless — default 1.0

  // Surface properties
  surfaceEmissivity: number         // dimensionless (0–1) — wall emissivity
  roofEmissivity?: number           // dimensionless (0–1) — falls back to surfaceEmissivity

  // Metadata
  metadata: CalculationMetadata
}

// ─── Per-Surface Result ────────────────────────────────────────────────────────

export interface PerSurfaceResult {
  hInternal: number               // W/(m²·K) — internal film HTC
  hExternal: number               // W/(m²·K) — external convection incl. wind enhancement
  hExternalNatural: number        // W/(m²·K) — natural convection before wind enhancement
  hRadiation: number              // W/(m²·K) — linearized radiation HTC
  uOverall: number                // W/(m²·K) — overall heat transfer coefficient
  area: number                    // m² — surface area
  heatLoss: number                // W — heat loss through this surface
  twInside: number                // °C — converged inside wall temperature
  twOutside: number               // °C — converged outside wall temperature
  grashof: number                 // internal Grashof
  prandtl: number                 // internal Prandtl
  rayleigh: number                // Gr × Pr
  nusseltInternal: number         // internal Nusselt
  nusseltExternal: number         // external Nusselt
}

export interface IterationDetail {
  iteration: number
  dryWall: PerSurfaceResult
  wetWall: PerSurfaceResult
  roof: PerSurfaceResult
  floor: PerSurfaceResult
}

// ─── Calculation Output ───────────────────────────────────────────────────────

export interface CoolingResult {
  rateCHr: number                 // °C/hr — cooling rate
  timeToAmbientHr: number | null  // hr — time to cool to ambient (null if no fluid)
}

// Kept for ActionMenu compatibility — not used by the engine
export interface DerivedGeometry {
  tankDiameter: number
  tankHeight: number
  liquidLevel: number
  tankRoofType?: TankRoofType
  roofHeight?: number
}

// ─── Shared Head Types (from vessels-calculation) ────────────────────────────

export enum HeadType {
  FLAT = "Flat",
  ELLIPSOIDAL_2_1 = "2:1 Ellipsoidal",
  HEMISPHERICAL = "Hemispherical",
  TORISPHERICAL_80_10 = "Torispherical 80:10",
}

// ─── Horizontal Tank Types ────────────────────────────────────────────────────

export interface HorizontalTankInput {
  tag: string
  description?: string

  // Tank geometry (mm)
  insideDiameter: number          // mm
  tankLength: number               // mm — tan-tan shell length
  headType: HeadType
  headDepth?: number               // mm — auto-calculated if omitted
  flangeWidth?: number             // mm — flange extension beyond tan line
  liquidLevel: number              // mm — from bottom of shell

  // Operating (°C, m/s)
  fluidTemp: number
  vaporTemp?: number               // °C — dry/vapor space bulk temperature; defaults to fluidTemp
  ambientTemp: number
  windSpeed: number
  groundTemp?: number

  // Wall construction (mm, W/(m·K))
  wallThickness: number
  wallConductivity: number
  insulationThickness: number
  insulationConductivity: number

  // Fluid properties (SI)
  fluidDensity: number
  fluidSpecificHeat: number
  fluidViscosity: number
  fluidThermalConductivity: number
  fluidExpansionCoeff: number

  // Vapor/gas (optional — falls back to air)
  vaporDensity?: number
  vaporSpecificHeat?: number
  vaporViscosity?: number
  vaporThermalConductivity?: number
  vaporExpansionCoeff?: number

  // Fouling (W/(m²·K))
  foulingDryWall?: number
  foulingWetWall?: number
  foulingDryHead?: number
  foulingWetHead?: number

  // Surface
  surfaceEmissivity: number
  windEnhancement?: number
  groundConductivity?: number   // W/(m·K)

  metadata: CalculationMetadata
}

// ─── Pipe Calculator Types ────────────────────────────────────────────────────

export enum PipeType {
  CIRCULAR = "circular",
  RECTANGULAR = "rectangular",
  SQUARE = "square",
}

export enum PipeOrientation {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

export interface PipeCalculationInput {
  tag: string
  description?: string

  // Pipe geometry
  pipeType: PipeType
  pipeOrientation: PipeOrientation
  pipeLength: number              // m

  // Circular pipe (mm)
  insideDiameter?: number         // mm — manual override
  outsideDiameter?: number        // mm — manual override

  // Rectangular/square duct (mm)
  sideA?: number                  // mm
  sideB?: number                  // mm

  // Fluid
  flowRate: number                // kg/h
  inletTemp: number               // °C
  pressure?: number               // barg

  // Fluid properties (SI)
  fluidDensity: number            // kg/m³
  fluidSpecificHeat: number       // J/(kg·K)
  fluidViscosity: number          // Pa·s
  fluidThermalConductivity: number // W/(m·K)

  // Wall construction
  wallThickness: number           // mm — pipe wall (or 0 if using ID/OD)
  wallConductivity: number        // W/(m·K)
  insulationThickness: number     // mm (0 = none)
  insulationConductivity: number  // W/(m·K)

  // Operating
  ambientTemp: number             // °C
  windSpeed: number               // m/s

  // Surface
  surfaceEmissivity: number       // dimensionless
  windEnhancement?: number        // dimensionless

  // Metadata
  metadata: CalculationMetadata
}

export interface PipeIterationDetail {
  iteration: number
  internalHTC: number
  externalHTC: number
  externalNaturalHTC: number
  radiationHTC: number
  uOverall: number
  heatLoss: number
  outletTemp: number
  twOutside: number
  reynoldsInternal: number
  nusseltExternal: number
}

export interface PipeCalculationResult {
  status: CalculationStatus
  internalHTC: number            // W/(m²·K)
  externalHTC: number             // W/(m²·K)
  externalNaturalHTC: number      // W/(m²·K)
  radiationHTC: number            // W/(m²·K)
  uOverall: number                // W/(m²·K)
  surfaceArea: number             // m²
  heatLoss: number                // W
  inletTemp: number               // °C
  outletTemp: number              // °C
  reynoldsInternal: number
  prandtl: number
  nusseltInternal: number
  nusseltExternal: number
  reynoldsExternal: number
  twInside: number                // °C
  twOutside: number               // °C
  iterations: PipeIterationDetail[]
  calculatedAt: string
}

// ─── Horizontal Tank Types ────────────────────────────────────────────────────

export interface HorizontalTankSurfaceSnap {
  hInternal: number; hExternal: number; hRadiation: number; uOverall: number
  area: number; heatLoss: number; twInside: number; twOutside: number
  grashof: number; prandtl: number; rayleigh: number
  nusseltInternal: number; nusseltExternal: number
}

export interface HorizontalTankIterationDetail {
  iteration: number
  dryWall: HorizontalTankSurfaceSnap
  wetWall: HorizontalTankSurfaceSnap
  dryHead: HorizontalTankSurfaceSnap
  wetHead: HorizontalTankSurfaceSnap
}

export interface HorizontalTankResult {
  status: CalculationStatus
  dryWall: HorizontalTankSurfaceSnap
  wetWall: HorizontalTankSurfaceSnap
  dryHead: HorizontalTankSurfaceSnap
  wetHead: HorizontalTankSurfaceSnap
  totalHeatLoss: number
  totalArea: number
  cooling: CoolingResult
  reynoldsExternal: number
  iterations: HorizontalTankIterationDetail[]
  calculatedAt: string
}

export interface CalculationResult {
  status: CalculationStatus
  // Per-surface final results (from last iteration)
  dryWall: PerSurfaceResult
  wetWall: PerSurfaceResult
  roof: PerSurfaceResult
  floor: PerSurfaceResult
  // Aggregates
  totalHeatLoss: number           // W — sum of all surfaces
  totalArea: number               // m² — sum of all surface areas
  cooling: CoolingResult
  reynoldsExternal: number        // Re for wind over tank
  // Iteration history (8 iterations)
  iterations: IterationDetail[]
  calculatedAt: string            // ISO timestamp
}

export type HeatTransferCalculationInput =
  | CalculationInput
  | PipeCalculationInput
  | HorizontalTankInput

export type HeatTransferCalculationResult =
  | CalculationResult
  | PipeCalculationResult
  | HorizontalTankResult

// ─── Status ───────────────────────────────────────────────────────────────────

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
