/**
 * Liquid sizing primitives (spec §8; ISA-75.01.01 liquid logic).
 * All pressures in absolute system units; Q in system flow; N1 from the system N-set.
 */
import { FF_MAX, FF_MIN } from "./constants"

/** Liquid critical-pressure-ratio factor: FF = clamp(0.96 − 0.28·√(Pv/Pc), 0, 0.96). */
export function ffFactor(Pv: number, Pc: number): number {
  const ff = 0.96 - 0.28 * Math.sqrt(Pv / Pc)
  return Math.min(FF_MAX, Math.max(FF_MIN, ff))
}

/**
 * Choked pressure drop.
 *   no fittings: dPChoked = FL²·(P1 − FF·Pv)
 *   fittings:    dPChoked = (FLP/Fp)²·(P1 − FF·Pv)
 */
export function dpChoked(params: {
  P1: number
  Pv: number
  FF: number
  FL: number
  FLP?: number | null
  Fp?: number
  fittingsActive: boolean
}): number {
  const { P1, Pv, FF, FL, FLP, Fp, fittingsActive } = params
  const driving = P1 - FF * Pv
  if (fittingsActive && FLP != null && Fp != null) {
    const ratio = FLP / Fp
    return ratio * ratio * driving
  }
  return FL * FL * driving
}

/** Core liquid coefficient: Cv = Q / (N1·Fp·Fr)·√(Gf/dPSizing). */
export function liquidCv(params: {
  Q: number
  N1: number
  Fp: number
  Fr: number
  Gf: number
  dPSizing: number
}): number {
  const { Q, N1, Fp, Fr, Gf, dPSizing } = params
  return (Q / (N1 * Fp * Fr)) * Math.sqrt(Gf / dPSizing)
}

/** Cavitation index σ = (P1 − Pv) / (P1 − P2). */
export function cavitationSigma(P1: number, P2: number, Pv: number): number | null {
  const dp = P1 - P2
  if (dp <= 0) return null
  return (P1 - Pv) / dp
}
