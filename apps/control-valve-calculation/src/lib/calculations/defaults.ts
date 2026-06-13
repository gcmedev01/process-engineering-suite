/**
 * Typical FL / xT / Fd at full rated travel, by valve type (IEC_GAP_RESOLUTION §4, Table 2).
 *
 * These are FALLBACK DEFAULTS ONLY. When used, the engine pushes
 * "FL/xT/Fd are typical defaults; confirm with valve manufacturer" into assumptions[].
 *
 * Keyed by the app's coarse `ValveType`; values pick a representative trim/flow row
 * from Table 2 (contoured-plug-open for globe; full-bore for ball; swing-through 60° for
 * butterfly; eccentric spherical plug for rotary). Users can override per-valve in ValveConfig.
 */
import type { ValveType } from "@/types"

export interface ValveCoefficients {
  FL: number
  xT: number
  Fd: number
}

export const VALVE_DEFAULTS: Record<ValveType, ValveCoefficients> = {
  // Globe, single-port contoured plug, flow-to-open
  globe: { FL: 0.9, xT: 0.72, Fd: 0.46 },
  // Globe angle, contoured plug (lin & =%), open
  globe_angle: { FL: 0.9, xT: 0.72, Fd: 0.46 },
  // Ball, full bore (70°)
  ball: { FL: 0.74, xT: 0.42, Fd: 0.99 },
  // Butterfly, swing-through (60°), centered shaft
  butterfly: { FL: 0.7, xT: 0.42, Fd: 0.5 },
  // Rotary, eccentric spherical plug, open
  rotary_plug: { FL: 0.85, xT: 0.6, Fd: 0.42 },
  // Special / unknown — conservative globe-like defaults
  special: { FL: 0.9, xT: 0.7, Fd: 0.46 },
}

export const DEFAULTS_ASSUMPTION =
  "FL/xT/Fd are typical defaults; confirm with valve manufacturer."

/**
 * Resolve the three valve coefficients: explicit ValveConfig values win; any missing
 * one falls back to the type default. Returns the resolved set + whether a default was used.
 */
export function resolveCoefficients(
  valveType: ValveType,
  provided: { FL?: number; xT?: number; Fd?: number },
): { coeffs: ValveCoefficients; usedDefault: boolean } {
  const def = VALVE_DEFAULTS[valveType] ?? VALVE_DEFAULTS.special
  const usedDefault =
    provided.FL == null || provided.xT == null || provided.Fd == null
  return {
    coeffs: {
      FL: provided.FL ?? def.FL,
      xT: provided.xT ?? def.xT,
      Fd: provided.Fd ?? def.Fd,
    },
    usedDefault,
  }
}
