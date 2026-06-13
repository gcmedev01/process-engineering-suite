/**
 * Gas/vapor sizing primitives (spec §9; ISA-75.01.01 gas logic).
 * Pressures in absolute system units; T1 absolute (K or °R); N6/N7 from the system N-set.
 */
import { Y_FLOOR } from "./constants"

/** Pressure-drop ratio x = (P1 − P2)/P1. */
export function pressureRatio(P1: number, P2: number): number {
  return (P1 - P2) / P1
}

/** Specific-heat ratio factor Fk = k / 1.40. */
export function fkFactor(k: number): number {
  return k / 1.4
}

/** Terminal pressure-drop ratio limit: xLimit = Fk·(xTP if fittings else xT). */
export function xLimit(Fk: number, xTerminal: number): number {
  return Fk * xTerminal
}

/** Expansion factor: Y = max(0.667, 1 − xSizing/(3·Fk·xTerminal)). */
export function expansionFactor(xSizing: number, Fk: number, xTerminal: number): number {
  const y = 1 - xSizing / (3 * Fk * xTerminal)
  return Math.max(Y_FLOOR, y)
}

/**
 * Volumetric (standard-flow) coefficient:
 *   Cv = Q / (N7·Fp·P1·Y)·√(M·T1abs·Z / xSizing).
 */
export function gasCvVolumetric(params: {
  Q: number
  N7: number
  Fp: number
  P1: number
  Y: number
  M: number
  T1abs: number
  Z: number
  xSizing: number
}): number {
  const { Q, N7, Fp, P1, Y, M, T1abs, Z, xSizing } = params
  return (Q / (N7 * Fp * P1 * Y)) * Math.sqrt((M * T1abs * Z) / xSizing)
}

/**
 * Mass-flow coefficient (ISA/IEC mass form W = N6·Fp·Y·Cv·√(x·P1·ρ1)):
 *   Cv = W / (N6·Fp·Y·√(xSizing·P1·ρ1)).
 * P1 sits inside the radical per the standard (the spec §9 prose placed it
 * outside; the dimensionally-correct standard form is used here).
 */
export function gasCvMass(params: {
  W: number
  N6: number
  Fp: number
  Y: number
  xSizing: number
  P1: number
  rho1: number
}): number {
  const { W, N6, Fp, Y, xSizing, P1, rho1 } = params
  return W / (N6 * Fp * Y * Math.sqrt(xSizing * P1 * rho1))
}
