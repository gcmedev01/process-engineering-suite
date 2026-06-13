/**
 * N-constants and engine limits for ISA-75.01.01 / IEC 60534-2-1 sizing.
 *
 * Values are the self-consistent **Cv-basis** set from IEC_GAP_RESOLUTION.md §3
 * (NOT the AGENTS.md table, which mixed editions). N2/N4/N5/N32 depend on the
 * diameter/flow unit, never on pressure. Internal sizing basis is always Cv.
 *
 *   metric_kpa : Q m³/h, P kPa, d mm, ν cSt(=mm²/s)
 *   metric_bar : Q m³/h, P bar, d mm, ν cSt
 *   US         : Q gpm/scfh, P psia, d in, ν cSt
 */
import type { UnitSystem } from "@/types"

export interface NConstants {
  N1: number
  N2: number
  N4: number
  N5: number
  N6: number
  N7: number
  N8: number
  N9: number
  N18: number
  N32: number
}

export const N_BY_SYSTEM: Record<UnitSystem, NConstants> = {
  US: {
    N1: 1.0,
    N2: 890,
    N4: 8.73e4,
    N5: 1.0e3,
    N6: 63.3,
    N7: 1360,
    N8: 19.3,
    N9: 7320,
    N18: 645,
    // US n1/n2 trim factors not in the Cv-basis Reynolds path; US Rev runs on a
    // metric internal basis (see units.ts → reynoldsConstants).
    N32: 0,
  },
  metric_bar: {
    N1: 0.865,
    N2: 2.14e-3,
    N4: 7.6e-2,
    N5: 2.41e-3,
    N6: 27.3,
    N7: 417,
    N8: 94.8,
    N9: 2250,
    N18: 1.0,
    N32: 127,
  },
  metric_kpa: {
    N1: 0.0865,
    N2: 2.14e-3,
    N4: 7.6e-2,
    N5: 2.41e-3,
    N6: 2.73,
    N7: 4.17,
    N8: 9.48,
    N9: 225,
    N18: 1.0,
    N32: 127,
  },
}

/** Liquid critical-pressure-ratio factor bounds. FF = clamp(0.96 - 0.28·√(Pv/Pc), …). */
export const FF_MIN = 0
export const FF_MAX = 0.96

/** Gas expansion-factor floor (terminal/choked). */
export const Y_FLOOR = 0.667

/** Standard atmospheric pressure (kPa absolute) for gauge→absolute conversion. */
export const ATM_KPA = 101.325

/** Universal gas constant (J/kmol·K) for ideal-gas speed of sound. */
export const R_UNIVERSAL = 8314

/** Cv/Kv conversion: Cv = KV_TO_CV · Kv. */
export const KV_TO_CV = 1.156

/** Relaxation-loop convergence. */
export const LOOP_MAX_ITER = 500
export const LOOP_TOL = 1e-3

/** Reynolds turbulent / laminar thresholds (IEC_GAP §2). */
export const REV_TURBULENT = 10000
export const REV_LAMINAR_ONLY = 10

/** Travel-% advisory bands (spec §13). */
export const TRAVEL_OVERSIZED_PCT = 10
export const TRAVEL_NEAR_OPEN_PCT = 85
export const TRAVEL_CRITICAL_PCT = 95

/** Velocity limits (m/s) — spec §14. */
export const LIQUID_VELOCITY_LIMIT = 6
export const LIQUID_FLASHING_VELOCITY_LIMIT = 30

/** Gas Mach screening thresholds — spec §14. */
export const MACH_NOISE = 0.3
export const MACH_VIBRATION = 0.5
