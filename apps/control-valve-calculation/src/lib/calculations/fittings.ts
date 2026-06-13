/**
 * Fitting geometry factors + installed correction factors (spec §10).
 *
 * Only applied when fittings are active (valve.fittings !== "none" OR line size
 * differs from valve size). All in the Cv basis; d/D in the system diameter unit,
 * N2 from the system N-set. Fp, FLP, xTP depend on the current trial Cv, so they
 * are recomputed every iteration of the unified relaxation loop.
 */

export interface FittingGeometry {
  d: number // valve bore (system unit)
  D1: number // upstream line size
  D2: number // downstream line size
}

/** ΣK = K1 + K2 + KB1 − KB2 (inlet reducer + outlet expander + Bernoulli terms). */
export function sumK({ d, D1, D2 }: FittingGeometry): {
  K1: number
  K2: number
  KB1: number
  KB2: number
  SK: number
} {
  const K1 = 0.5 * Math.pow(1 - (d * d) / (D1 * D1), 2)
  const K2 = 1.0 * Math.pow(1 - (d * d) / (D2 * D2), 2)
  const KB1 = 1 - Math.pow(d / D1, 4)
  const KB2 = 1 - Math.pow(d / D2, 4)
  return { K1, K2, KB1, KB2, SK: K1 + K2 + KB1 - KB2 }
}

/** Piping geometry factor: Fp = [1 + (ΣK/N2)·(Cv/d²)²]^(−1/2). */
export function pipingFactor(SK: number, Cv: number, d: number, N2: number): number {
  const r = Cv / (d * d)
  return Math.pow(1 + (SK / N2) * r * r, -0.5)
}

/** Combined liquid pressure-recovery factor with fittings:
 *  FLP = [1/FL² + (K1+KB1)/N2·(Cv/d²)²]^(−1/2). */
export function flpFactor(
  FL: number,
  K1: number,
  KB1: number,
  Cv: number,
  d: number,
  N2: number,
): number {
  const r = Cv / (d * d)
  return Math.pow(1 / (FL * FL) + ((K1 + KB1) / N2) * r * r, -0.5)
}

/** Combined gas terminal pressure-drop ratio with fittings:
 *  xTP = (xT/Fp²)·[1 + (xT·K1/N2)·(Cv/d²)²]^(−1). */
export function xtpFactor(
  xT: number,
  Fp: number,
  K1: number,
  Cv: number,
  d: number,
  N2: number,
): number {
  const r = Cv / (d * d)
  return (xT / (Fp * Fp)) * Math.pow(1 + ((xT * K1) / N2) * r * r, -1)
}
