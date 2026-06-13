/**
 * Single-case solver + the unified relaxation loop (spec §7 sizeCase, §10 loop).
 *
 * One loop couples Cv ↔ Fp/FLP/xTP ↔ Fr — never decoupled. Hard cap 500
 * iterations; on non-convergence the result is still returned with
 * converged:false and the matching WARN_*_NOCONV code(s).
 */
import type {
  CaseResult,
  EngineWarning,
  FluidProps,
  OperatingCase,
  ValveConfig,
  WarnCode,
} from "@/types"
import { LOOP_MAX_ITER, LOOP_TOL, REV_TURBULENT } from "./constants"
import { DEFAULTS_ASSUMPTION, resolveCoefficients } from "./defaults"
import { flpFactor, pipingFactor, sumK, xtpFactor } from "./fittings"
import { expansionFactor, fkFactor, gasCvMass, gasCvVolumetric, pressureRatio, xLimit } from "./gas"
import { cavitationSigma, dpChoked, ffFactor, liquidCv } from "./liquid"
import { reynoldsFactor } from "./reynolds"
import { liquidVelocityExceeded, pipeVelocity, speedOfSound } from "./screening"
import {
  cStToM2s,
  cToAbsolute,
  cvToKv,
  diameterToM,
  diameterToMm,
  flowToMetricM3h,
  nConstants,
  reynoldsConstants,
  toAbsolute,
  volFlowToM3s,
} from "./units"
import { makeWarning } from "./warnings"
import { travelPercentForCv, travelWarnings } from "./valveSelection"

const SUPPRESSED = new Set(["two_phase", "slurry", "non_newtonian"])

function emptyResult(oc: OperatingCase): CaseResult {
  return {
    caseName: oc.caseName,
    label: oc.label,
    CvRequired: null,
    KvRequired: null,
    dPActual: 0,
    dPSizing: 0,
    dPChoked: null,
    xActual: null,
    xSizing: null,
    xLimit: null,
    Y: null,
    Fp: 1,
    Fr: 1,
    FLP: null,
    xTP: null,
    Rev: null,
    sigma: null,
    calculatedTravelPercent: null,
    outletVelocity: null,
    mach: null,
    warnings: [],
    assumptions: [],
    iterations: 0,
    converged: false,
  }
}

function pushWarn(list: EngineWarning[], code: WarnCode): void {
  if (!list.some((w) => w.code === code)) list.push(makeWarning(code))
}

export function sizeCase(oc: OperatingCase, valve: ValveConfig, fluid: FluidProps): CaseResult {
  const system = valve.unitSystem
  const result = emptyResult(oc)
  const warnings = result.warnings
  const assumptions = result.assumptions

  // 1. Coefficients
  const { coeffs, usedDefault } = resolveCoefficients(valve.valveType, valve)
  if (usedDefault) assumptions.push(DEFAULTS_ASSUMPTION)
  const { FL, xT, Fd } = coeffs
  result.Fr = 1

  // 2. Pressures → absolute (system units)
  const P1 = toAbsolute(oc.P1, oc.P1Basis, system, oc.pAtm)
  let P2: number
  if (oc.P2 != null) P2 = toAbsolute(oc.P2, oc.P2Basis ?? "absolute", system, oc.pAtm)
  else if (oc.dP != null) P2 = P1 - oc.dP
  else P2 = P1
  const dPActual = P1 - P2
  result.dPActual = dPActual

  // 3. Suppressed / unsupported fluids (defensive — index.ts also intercepts)
  if (SUPPRESSED.has(fluid.fluidType)) {
    pushWarn(warnings, "WARN_TWO_PHASE")
    return result
  }
  if (fluid.fluidType === "steam") {
    pushWarn(warnings, "WARN_STEAM")
    return result
  }
  // A gauge input that resolves to a non-positive absolute pressure signals a
  // gauge/absolute mix-up (absolute is required for the ratio math).
  if (P1 <= 0) {
    pushWarn(warnings, oc.P1Basis === "gauge" ? "WARN_GAUGE" : "WARN_DP_NONPOS")
    return result
  }
  if (dPActual <= 0) {
    pushWarn(warnings, "WARN_DP_NONPOS")
    return result
  }

  // 4. Fittings
  const fittingsActive =
    valve.fittings !== "none" ||
    valve.lineSizeUpstream !== valve.valveSize ||
    valve.lineSizeDownstream !== valve.valveSize
  if (fittingsActive) pushWarn(warnings, "WARN_FITTINGS")
  const geom = fittingsActive
    ? sumK({ d: valve.valveSize, D1: valve.lineSizeUpstream, D2: valve.lineSizeDownstream })
    : null

  if (fluid.fluidType === "liquid") {
    solveLiquid(oc, valve, fluid, { FL, Fd, P1, P2, dPActual, fittingsActive, geom }, result)
  } else {
    solveGas(oc, valve, fluid, { xT, P1, P2, fittingsActive, geom }, result)
  }
  return result
}

// ─── Liquid ───

function solveLiquid(
  oc: OperatingCase,
  valve: ValveConfig,
  fluid: FluidProps,
  ctx: {
    FL: number
    Fd: number
    P1: number
    P2: number
    dPActual: number
    fittingsActive: boolean
    geom: ReturnType<typeof sumK> | null
  },
  result: CaseResult,
): void {
  const { FL, Fd, P1, P2, dPActual, fittingsActive, geom } = ctx
  const warnings = result.warnings
  const system = valve.unitSystem
  const N = nConstants(system)
  const revN = reynoldsConstants()
  const d = valve.valveSize

  const Pv = fluid.Pv ?? 0
  const Pc = fluid.Pc ?? 0
  const Gf = fluid.Gf ?? 1

  if (P1 <= 0 || P2 <= 0 || Pv <= 0) {
    pushWarn(warnings, "WARN_DP_NONPOS")
    return
  }

  const FF = ffFactor(Pv, Pc)
  const viscous = fluid.kinematicViscosity != null && fluid.kinematicViscosity > 0

  // Volumetric flow for the core equation (and Reynolds): mass → Q via density.
  let Qvol = oc.flowRate
  if (oc.flowMode === "mass" && fluid.upstreamDensity && fluid.upstreamDensity > 0) {
    Qvol = oc.flowRate / fluid.upstreamDensity // kg/h ÷ kg/m³ = m³/h
  }

  let Fp = 1
  let Fr = 1
  let FLP: number | null = null
  let rev: number | null = null

  // Initial Cv (Fp=Fr=1, FL-only choked ΔP)
  let dPChokedV = dpChoked({ P1, Pv, FF, FL, fittingsActive: false })
  let dPSizing = Math.min(dPActual, dPChokedV)
  let Cv = liquidCv({ Q: Qvol, N1: N.N1, Fp, Fr, Gf, dPSizing })

  let converged = false
  let iterations = 0
  for (let it = 1; it <= LOOP_MAX_ITER; it++) {
    iterations = it
    if (fittingsActive && geom) {
      Fp = pipingFactor(geom.SK, Cv, d, N.N2)
      FLP = flpFactor(FL, geom.K1, geom.KB1, Cv, d, N.N2)
    }
    if (viscous) {
      const r = reynoldsFactor({
        Ci: Cv,
        FL,
        Fd,
        Q: flowToMetricM3h(Qvol, system),
        nu: cStToM2s(fluid.kinematicViscosity as number),
        d: diameterToMm(d, system),
        N2: revN.N2,
        N4: revN.N4,
        N18: revN.N18,
        N32: revN.N32,
      })
      rev = r.rev
      Fr = r.fr
    }
    dPChokedV = dpChoked({ P1, Pv, FF, FL, FLP, Fp, fittingsActive })
    dPSizing = Math.min(dPActual, dPChokedV)
    const CvNew = liquidCv({ Q: Qvol, N1: N.N1, Fp, Fr, Gf, dPSizing })
    if (!Number.isFinite(CvNew) || CvNew <= 0) break
    if (Math.abs((CvNew - Cv) / Cv) < LOOP_TOL) {
      Cv = CvNew
      converged = true
      break
    }
    Cv = CvNew
  }

  // Flags
  const flashing = P2 <= Pv
  if (flashing) pushWarn(warnings, "WARN_FLASHING")
  const choked = dPActual >= dPChokedV
  if (choked) pushWarn(warnings, "WARN_LIQ_CHOKED")
  else if (dPActual >= 0.8 * dPChokedV) pushWarn(warnings, "WARN_CAVITATION")
  if (viscous && rev != null && rev < REV_TURBULENT) pushWarn(warnings, "WARN_VISCOUS")
  if (!converged) {
    if (fittingsActive) pushWarn(warnings, "WARN_FP_NOCONV")
    if (viscous) pushWarn(warnings, "WARN_FR_NOCONV")
    if (!fittingsActive && !viscous) pushWarn(warnings, "WARN_FP_NOCONV")
  }

  // Velocity screening (downstream line CSA)
  const velocity = pipeVelocity(volFlowToM3s(Qvol, system), diameterToM(valve.lineSizeDownstream, system))
  if (liquidVelocityExceeded(velocity, flashing)) pushWarn(warnings, "WARN_VELOCITY")

  // Travel
  const travel = valve.cvCurve
    ? travelPercentForCv(Cv, valve.cvCurve, valve.flowCharacteristic)
    : null
  for (const code of travelWarnings(travel)) pushWarn(warnings, code)

  const finiteCv = Number.isFinite(Cv) && Cv > 0 ? Cv : null
  result.CvRequired = finiteCv
  result.KvRequired = finiteCv != null ? cvToKv(finiteCv) : null
  result.dPSizing = dPSizing
  result.dPChoked = dPChokedV
  result.Fp = Fp
  result.Fr = Fr
  result.FLP = FLP
  result.Rev = rev
  result.sigma = cavitationSigma(P1, P2, Pv)
  result.calculatedTravelPercent = travel
  result.outletVelocity = velocity
  result.iterations = iterations
  result.converged = converged
}

// ─── Gas / vapor ───

function solveGas(
  oc: OperatingCase,
  valve: ValveConfig,
  fluid: FluidProps,
  ctx: {
    xT: number
    P1: number
    P2: number
    fittingsActive: boolean
    geom: ReturnType<typeof sumK> | null
  },
  result: CaseResult,
): void {
  const { xT, P1, P2, fittingsActive, geom } = ctx
  const warnings = result.warnings
  const assumptions = result.assumptions
  const system = valve.unitSystem
  const N = nConstants(system)
  const d = valve.valveSize

  if (P2 >= P1) {
    pushWarn(warnings, "WARN_DP_NONPOS")
    return
  }

  const k = fluid.k ?? 1.4
  const M = fluid.M ?? 0
  let Z = fluid.Z ?? 1.0
  if (fluid.Z == null) {
    Z = 1.0
    pushWarn(warnings, "WARN_Z_DEFAULTED")
    assumptions.push("Compressibility Z defaulted to 1.0.")
  }
  const Fk = fkFactor(k)
  const T1abs = cToAbsolute(oc.T1, system)
  const x = pressureRatio(P1, P2)

  let Fp = 1
  let xTP: number | null = null

  const coreCv = (FpCur: number, xSizing: number, Y: number): number => {
    if (oc.flowMode === "mass") {
      const rho1 = fluid.upstreamDensity ?? 0
      return gasCvMass({ W: oc.flowRate, N6: N.N6, Fp: FpCur, Y, xSizing, P1, rho1 })
    }
    return gasCvVolumetric({
      Q: oc.flowRate,
      N7: N.N7,
      Fp: FpCur,
      P1,
      Y,
      M,
      T1abs,
      Z,
      xSizing,
    })
  }

  // Iterate Fp/xTP ↔ Cv
  let xTerminal = xT
  let xLim = xLimit(Fk, xTerminal)
  let xSizing = Math.min(x, xLim)
  let Y = expansionFactor(xSizing, Fk, xTerminal)
  let Cv = coreCv(Fp, xSizing, Y)

  let converged = false
  let iterations = 0
  for (let it = 1; it <= LOOP_MAX_ITER; it++) {
    iterations = it
    if (fittingsActive && geom) {
      Fp = pipingFactor(geom.SK, Cv, d, N.N2)
      xTP = xtpFactor(xT, Fp, geom.K1, Cv, d, N.N2)
    }
    xTerminal = fittingsActive && xTP != null ? xTP : xT
    xLim = xLimit(Fk, xTerminal)
    xSizing = Math.min(x, xLim)
    Y = expansionFactor(xSizing, Fk, xTerminal)
    const CvNew = coreCv(Fp, xSizing, Y)
    if (!Number.isFinite(CvNew) || CvNew <= 0) break
    if (Math.abs((CvNew - Cv) / Cv) < LOOP_TOL) {
      Cv = CvNew
      converged = true
      break
    }
    Cv = CvNew
  }

  const choked = x >= xLim
  if (choked) pushWarn(warnings, "WARN_GAS_CHOKED")
  if (!converged && fittingsActive) pushWarn(warnings, "WARN_FP_NOCONV")
  if (!converged && !fittingsActive) pushWarn(warnings, "WARN_FP_NOCONV")

  // Mach screening (best-effort; SI). Always flag noise (modules out of scope).
  pushWarn(warnings, "WARN_NOISE")
  const T1K = oc.T1 + 273.15
  const c = speedOfSound(k, T1K, M)
  let mach: number | null = null
  if (c != null && fluid.upstreamDensity && fluid.upstreamDensity > 0) {
    // Outlet density ≈ ρ1·(P2/P1) (ideal, isothermal approximation).
    const rhoOut = fluid.upstreamDensity * (P2 / P1)
    if (rhoOut > 0) {
      let massKgs: number | null = null
      if (oc.flowMode === "mass") {
        massKgs = (system === "US" ? oc.flowRate * 0.45359237 : oc.flowRate) / 3600
      }
      if (massKgs != null) {
        const volOut = massKgs / rhoOut
        const Dm = diameterToM(valve.lineSizeDownstream, system)
        const vel = pipeVelocity(volOut, Dm)
        if (vel != null) {
          mach = vel / c
          if (mach > 0.5) pushWarn(warnings, "WARN_VELOCITY")
        }
      }
    }
  }

  const travel = valve.cvCurve
    ? travelPercentForCv(Cv, valve.cvCurve, valve.flowCharacteristic)
    : null
  for (const code of travelWarnings(travel)) pushWarn(warnings, code)

  const finiteCv = Number.isFinite(Cv) && Cv > 0 ? Cv : null
  result.CvRequired = finiteCv
  result.KvRequired = finiteCv != null ? cvToKv(finiteCv) : null
  result.dPSizing = result.dPActual // gas sizing is via x; expose actual ΔP
  result.dPChoked = null
  result.xActual = x
  result.xSizing = xSizing
  result.xLimit = xLim
  result.Y = Y
  result.Fp = Fp
  result.Fr = 1
  result.xTP = xTP
  result.calculatedTravelPercent = travel
  result.mach = mach
  result.iterations = iterations
  result.converged = converged
}
