/**
 * Valve Reynolds number Rev and Reynolds factor Fr — IEC 60534-2-1 Annex G.
 * Equations + pseudocode verbatim from IEC_GAP_RESOLUTION.md §1, §2, §5
 * (verified against the standard's reduced-trim worked example, IEC_GAP §6).
 *
 * Inputs are one consistent Cv-basis metric unit set: Ci (Cv), d (mm), Q (m³/h),
 * ν (m²/s), with N2/N4/N18/N32 from the metric column.
 *
 * NOTE: `Rev` uses FL and Ci (the trial turbulent Cv), NOT Fp·Cv (IEC_GAP §1).
 */
import { REV_LAMINAR_ONLY, REV_TURBULENT } from "./constants"

export interface ReynoldsInput {
  Ci: number
  FL: number
  Fd: number
  Q: number // m³/h (metric internal basis)
  nu: number // m²/s
  d: number // mm
  N2: number
  N4: number
  N18: number
  N32: number
}

/** Standard Eq. 28 — valve Reynolds number. */
export function reynoldsNumber(p: ReynoldsInput): number {
  const { Ci, FL, Fd, Q, nu, d, N2, N4 } = p
  if (nu <= 0 || Ci <= 0) return Number.POSITIVE_INFINITY
  return (
    ((N4 * Fd * Q) / (nu * Math.sqrt(Ci * FL))) *
    Math.pow((FL * FL * Ci * Ci) / (N2 * Math.pow(d, 4)) + 1, 0.25)
  )
}

/**
 * Reynolds factor Fr from a known Rev and trim ratio (Ci/d²). Annex G.
 * Selection: turbulent (Fr=1) ≥ 10000; below, the lower of transitional/laminar;
 * < 10 → laminar only. Full-size vs reduced trim picks n1 vs n2.
 */
export function reynoldsFactorFromRev(
  rev: number,
  ratio: number, // Ci / d²
  FL: number,
  N2: number,
  N18: number,
  N32: number,
): number {
  if (rev >= REV_TURBULENT) return 1.0

  const fullSize = ratio >= 0.016 * N18
  const n = fullSize
    ? N2 / (ratio * ratio) // n1 (full-size) — confirm vs Annex G Eq G.1 before shipping (spec §19)
    : 1 + N32 * Math.pow(ratio, 2 / 3) // n2 (reduced) — verified

  const frLaminar = Math.min(1, (0.026 / FL) * Math.sqrt(n * rev))
  if (rev < REV_LAMINAR_ONLY) return frLaminar

  const frTrans = 1 + ((0.33 * Math.sqrt(FL)) / Math.pow(n, 0.25)) * Math.log10(rev / REV_TURBULENT)
  return Math.min(frLaminar, frTrans, 1)
}

/** Convenience: compute Rev and Fr together. */
export function reynoldsFactor(p: ReynoldsInput): { rev: number; fr: number } {
  const rev = reynoldsNumber(p)
  const ratio = p.Ci / (p.d * p.d)
  const fr = reynoldsFactorFromRev(rev, ratio, p.FL, p.N2, p.N18, p.N32)
  return { rev, fr }
}
