/**
 * Velocity & Mach screening (spec §14).
 *
 * Liquid: outlet velocity from actual volumetric flow / downstream line CSA.
 *   limit 6 m/s (30 m/s flashing) → WARN_VELOCITY.
 * Gas: Mach = Voutlet / c, c = √(k·R·T1abs/M) (ideal gas, R = 8314 J/kmol·K).
 *   Mach > 0.3 noise, > 0.5 vibration. WARN_NOISE always emitted (modules out of scope).
 *
 * All inputs in SI: flow m³/s, diameter m, density kg/m³, T K, M kg/kmol.
 */
import { LIQUID_FLASHING_VELOCITY_LIMIT, LIQUID_VELOCITY_LIMIT, R_UNIVERSAL } from "./constants"

/** Cross-sectional velocity (m/s) for a volumetric flow (m³/s) through a bore (m). */
export function pipeVelocity(volFlowM3s: number, diameterM: number): number | null {
  if (diameterM <= 0) return null
  const area = (Math.PI / 4) * diameterM * diameterM
  if (area <= 0) return null
  return volFlowM3s / area
}

/** Ideal-gas speed of sound (m/s): c = √(k·R·T/M). */
export function speedOfSound(k: number, T1absK: number, M: number): number | null {
  if (M <= 0 || T1absK <= 0 || k <= 0) return null
  return Math.sqrt((k * R_UNIVERSAL * T1absK) / M)
}

/** True when liquid outlet velocity exceeds its limit (flashing raises the cap to 30 m/s). */
export function liquidVelocityExceeded(velocity: number | null, flashing: boolean): boolean {
  if (velocity == null) return false
  const limit = flashing ? LIQUID_FLASHING_VELOCITY_LIMIT : LIQUID_VELOCITY_LIMIT
  return velocity > limit
}
