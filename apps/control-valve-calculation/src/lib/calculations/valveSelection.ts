/**
 * Valve travel / opening checks (spec §13).
 *
 * If a manufacturer Cv curve is supplied, interpolate the travel-% that delivers
 * the required Cv. Opening-band advisories: <10% oversized, >85% near-open,
 * >95% undersized/critical. With no curve, travel is null (no flag).
 */
import type { FlowCharacteristic, WarnCode } from "@/types"
import {
  TRAVEL_CRITICAL_PCT,
  TRAVEL_NEAR_OPEN_PCT,
  TRAVEL_OVERSIZED_PCT,
} from "./constants"

export interface CvCurvePoint {
  travelPercent: number
  cv: number
}

/**
 * Interpolate travel-% for a required Cv against the (monotonic) curve.
 * Linear interpolation in Cv vs travel; clamps below the first point, returns
 * >100 sentinel when CvRequired exceeds the curve's max (undersized).
 */
export function travelPercentForCv(
  cvRequired: number,
  curve: CvCurvePoint[],
  _characteristic: FlowCharacteristic,
): number | null {
  if (!curve || curve.length === 0 || !Number.isFinite(cvRequired)) return null
  const pts = [...curve].sort((a, b) => a.travelPercent - b.travelPercent)

  const first = pts[0]
  const last = pts[pts.length - 1]
  if (cvRequired <= first.cv) return first.travelPercent
  if (cvRequired >= last.cv) {
    // Beyond full open — extrapolate flag value above 100 so callers detect undersize.
    return last.cv === first.cv ? last.travelPercent : Math.max(last.travelPercent, 100.01)
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if (cvRequired >= a.cv && cvRequired <= b.cv) {
      if (b.cv === a.cv) return a.travelPercent
      const frac = (cvRequired - a.cv) / (b.cv - a.cv)
      return a.travelPercent + frac * (b.travelPercent - a.travelPercent)
    }
  }
  return last.travelPercent
}

/** Map a travel-% to opening-band warning codes (may be empty). */
export function travelWarnings(travelPercent: number | null): WarnCode[] {
  if (travelPercent == null) return []
  const codes: WarnCode[] = []
  if (travelPercent > TRAVEL_CRITICAL_PCT) {
    codes.push("WARN_UNDERSIZED")
  } else if (travelPercent > TRAVEL_NEAR_OPEN_PCT) {
    codes.push("WARN_NEAR_OPEN")
  }
  if (travelPercent < TRAVEL_OVERSIZED_PCT) {
    codes.push("WARN_OVERSIZED")
  }
  return codes
}
