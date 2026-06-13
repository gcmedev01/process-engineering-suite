/**
 * Unit helpers + N-constant routing for the sizing engine.
 *
 * The engine computes in each unit system's NATIVE units (the UI/UoM layer
 * presents/persists base units and hands the engine values already expressed in
 * the selected system):
 *   US         : Q gpm/scfh, P psia, d in, T °R
 *   metric_bar : Q m³/h,     P bar,  d mm, T K
 *   metric_kpa : Q m³/h,     P kPa,  d mm, T K
 * with ν always in cSt and the matching N-constant set (constants.ts).
 *
 * Gauge→absolute adds atmospheric pressure expressed in the system's pressure
 * unit; °C→absolute yields K (metric) or °R (US).
 *
 * The Reynolds step always runs on a consistent metric (Cv, mm, m³/h, m²/s)
 * basis since the verified Fr N-set is metric (IEC_GAP §3; spec §6 note).
 */
import type { PressureBasis, UnitSystem } from "@/types"
import { KV_TO_CV, N_BY_SYSTEM, type NConstants } from "./constants"

export function nConstants(system: UnitSystem): NConstants {
  return N_BY_SYSTEM[system]
}

export function reynoldsConstants(): NConstants {
  // Metric kPa set carries the verified Cv-basis Reynolds constants (N2/N4/N18/N32
  // are pressure-independent, so metric_kpa and metric_bar share them).
  return N_BY_SYSTEM.metric_kpa
}

export const cvToKv = (cv: number): number => cv / KV_TO_CV
export const kvToCv = (kv: number): number => kv * KV_TO_CV

/** Atmospheric pressure in the system's pressure unit. */
export function atmInSystem(system: UnitSystem): number {
  switch (system) {
    case "metric_kpa":
      return 101.325
    case "metric_bar":
      return 1.01325
    case "US":
      return 14.6959
  }
}

/**
 * Gauge/absolute → absolute, in the system's working pressure unit.
 * `pAtm`, when supplied, is assumed to be in the system's pressure unit.
 */
export function toAbsolute(
  value: number,
  basis: PressureBasis,
  system: UnitSystem,
  pAtm?: number,
): number {
  if (basis === "absolute") return value
  return value + (pAtm ?? atmInSystem(system))
}

/** °C → absolute temperature (K for metric, °R for US). */
export function cToAbsolute(tC: number, system: UnitSystem): number {
  const kelvin = tC + 273.15
  return system === "US" ? kelvin * 1.8 : kelvin
}

// ─── Reynolds metric-basis conversions ───

/** Volumetric flow → m³/h (US gpm → m³/h; metric already m³/h). */
export function flowToMetricM3h(volFlow: number, system: UnitSystem): number {
  return system === "US" ? volFlow * 0.2271247 : volFlow
}

/** Diameter → mm (US in → mm; metric already mm). */
export function diameterToMm(d: number, system: UnitSystem): number {
  return system === "US" ? d * 25.4 : d
}

/** Kinematic viscosity cSt → m²/s (1 cSt = 1e-6 m²/s). */
export function cStToM2s(nuCst: number): number {
  return nuCst * 1e-6
}

// ─── SI helpers for velocity/Mach screening ───

/** Volumetric flow (system units) → m³/s. */
export function volFlowToM3s(volFlow: number, system: UnitSystem): number {
  return system === "US" ? volFlow * 6.309019e-5 : volFlow / 3600 // gpm→m³/s ; m³/h→m³/s
}

/** Diameter (system units) → m. */
export function diameterToM(d: number, system: UnitSystem): number {
  return system === "US" ? (d * 25.4) / 1000 : d / 1000
}
