import { describe, expect, it } from "vitest"
import type {
  CalculationInput,
  FluidProps,
  OperatingCase,
  ValveConfig,
} from "@/types"
import { computeResult } from "../index"
import { sizeCase } from "../sizeCase"
import { reynoldsFactorFromRev, reynoldsNumber } from "../reynolds"
import { travelPercentForCv, travelWarnings } from "../valveSelection"
import { cvToKv, kvToCv, toAbsolute } from "../units"

// ─── Builders ───

function valve(over: Partial<ValveConfig> = {}): ValveConfig {
  return {
    unitSystem: "metric_kpa",
    valveType: "globe",
    flowCharacteristic: "linear",
    valveSize: 50.8,
    lineSizeUpstream: 50.8,
    lineSizeDownstream: 50.8,
    fittings: "none",
    FL: 0.9,
    xT: 0.7,
    Fd: 0.46,
    flowBasis: "Cv",
    ...over,
  }
}

function liquid(over: Partial<FluidProps> = {}): FluidProps {
  return { fluidType: "liquid", Gf: 1.0, Pv: 1.765, Pc: 22104, ...over }
}

function gas(over: Partial<FluidProps> = {}): FluidProps {
  return { fluidType: "gas", M: 29, Z: 1, k: 1.4, ...over }
}

function caseOf(over: Partial<OperatingCase> = {}): OperatingCase {
  return {
    caseName: "normal",
    flowMode: "volumetric_actual",
    flowRate: 22.712,
    P1: 689.476,
    P1Basis: "absolute",
    P2: 620.528,
    P2Basis: "absolute",
    T1: 20,
    ...over,
  }
}

function input(v: ValveConfig, f: FluidProps, cases: OperatingCase[]): CalculationInput {
  return {
    tag: "CV-100",
    metadata: { projectNumber: "", documentNumber: "", title: "", projectName: "", client: "" },
    valve: v,
    fluid: f,
    cases,
  }
}

// ─── 16-L1 water benchmark ───

describe("16-L1 water benchmark (turbulent, no fittings, no choke)", () => {
  it("Cv ≈ 31.62, Fp=Fr=1, converged, no warnings", () => {
    const v = valve({ unitSystem: "US", valveSize: 50.8, lineSizeUpstream: 50.8, lineSizeDownstream: 50.8 })
    const f = liquid({ Gf: 1.0, Pv: 0.256, Pc: 3206 })
    const oc = caseOf({ flowRate: 100, P1: 100, P2: 90 })
    const r = sizeCase(oc, v, f)
    expect(r.CvRequired).toBeCloseTo(31.62, 1)
    expect(r.Fp).toBe(1)
    expect(r.Fr).toBe(1)
    expect(r.converged).toBe(true)
    expect(r.warnings).toHaveLength(0)
  })
})

// ─── 16-L2 unit-routing equivalence ───

describe("16-L2 unit-routing equivalence", () => {
  const expectCv = (r: ReturnType<typeof sizeCase>) => expect(r.CvRequired).toBeCloseTo(31.62, 1)

  it("US / metric_bar / metric_kpa all give Cv ≈ 31.62", () => {
    const us = sizeCase(
      caseOf({ flowRate: 100, P1: 100, P2: 90 }),
      valve({ unitSystem: "US" }),
      liquid({ Pv: 0.256, Pc: 3206 }),
    )
    const kpa = sizeCase(
      caseOf({ flowRate: 22.712, P1: 689.476, P2: 620.528 }),
      valve({ unitSystem: "metric_kpa" }),
      liquid({ Pv: 1.765, Pc: 22104 }),
    )
    const bar = sizeCase(
      caseOf({ flowRate: 22.712, P1: 6.89476, P2: 6.20528 }),
      valve({ unitSystem: "metric_bar" }),
      liquid({ Pv: 0.01765, Pc: 221.04 }),
    )
    expectCv(us)
    expectCv(kpa)
    expectCv(bar)
  })
})

// ─── 16-L3 choked liquid ───

describe("16-L3 choked liquid", () => {
  it("flags WARN_LIQ_CHOKED and sizes on dPChoked", () => {
    const v = valve({ unitSystem: "metric_kpa" })
    const f = liquid({ Pv: 5, Pc: 22104 })
    const oc = caseOf({ flowRate: 22.712, P1: 200, P2: 20 }) // dPActual = 180
    const r = sizeCase(oc, v, f)
    expect(r.warnings.some((w) => w.code === "WARN_LIQ_CHOKED")).toBe(true)
    expect(r.warnings.some((w) => w.code === "WARN_FLASHING")).toBe(false)
    expect(r.dPChoked).not.toBeNull()
    expect(r.dPSizing).toBeCloseTo(r.dPChoked as number, 5)
    expect(r.dPSizing).toBeLessThan(r.dPActual)
  })
})

// ─── 16-L4 viscous ───

describe("16-L4 viscous liquid", () => {
  it("Rev < 10000, Fr < 1, converges, WARN_VISCOUS", () => {
    const v = valve({ unitSystem: "metric_kpa", valveSize: 15, lineSizeUpstream: 15, lineSizeDownstream: 15, FL: 0.98, Fd: 0.07 })
    const f = liquid({ Gf: 1, Pv: 1, Pc: 22104, kinematicViscosity: 13.38 })
    const oc = caseOf({ flowRate: 0.46, P1: 200, P2: 100 })
    const r = sizeCase(oc, v, f)
    expect(r.Rev).not.toBeNull()
    expect(r.Rev as number).toBeLessThan(10000)
    expect(r.Fr).toBeLessThan(1)
    expect(r.converged).toBe(true)
    expect(r.warnings.some((w) => w.code === "WARN_VISCOUS")).toBe(true)
  })

  it("reynoldsFactorFromRev reproduces the standard's reduced-trim example (Fr ≈ 0.715)", () => {
    // IEC_GAP §6: Rev=1202, ratio=7.96e-5, FL=0.98, N2=2.14e-3, N18=1.0, N32=127.
    const fr = reynoldsFactorFromRev(1202, 7.96e-5, 0.98, 2.14e-3, 1.0, 127)
    expect(fr).toBeCloseTo(0.715, 2)
  })

  it("reynoldsNumber is turbulent for low-viscosity water-like flow", () => {
    const rev = reynoldsNumber({
      Ci: 30,
      FL: 0.9,
      Fd: 0.46,
      Q: 22.712,
      nu: 1e-6, // ~water, m²/s
      d: 50,
      N2: 2.14e-3,
      N4: 7.6e-2,
      N18: 1.0,
      N32: 127,
    })
    expect(rev).toBeGreaterThan(10000)
  })
})

// ─── 16-G1 gas choke + Y floor ───

describe("16-G1 gas choke + Y floor", () => {
  it("x=0.9, xLimit=0.7, xSizing=0.7, Y=0.6667, WARN_GAS_CHOKED", () => {
    const v = valve({ unitSystem: "metric_kpa", xT: 0.7 })
    const f = gas({ M: 29, Z: 1, k: 1.4 })
    const oc = caseOf({ flowMode: "volumetric_standard", flowRate: 1000, P1: 100, P2: 10 })
    const r = sizeCase(oc, v, f)
    expect(r.xActual).toBeCloseTo(0.9, 5)
    expect(r.xLimit).toBeCloseTo(0.7, 5)
    expect(r.xSizing).toBeCloseTo(0.7, 5)
    expect(r.Y).toBeCloseTo(0.6667, 3)
    expect(r.warnings.some((w) => w.code === "WARN_GAS_CHOKED")).toBe(true)
    expect(r.warnings.some((w) => w.code === "WARN_NOISE")).toBe(true)
  })
})

// ─── 16-G2 Z scaling ───

describe("16-G2 Z scaling", () => {
  it("doubling Z scales Cv by √2 (non-choked)", () => {
    const v = valve({ unitSystem: "metric_kpa", xT: 0.7 })
    const oc = caseOf({ flowMode: "volumetric_standard", flowRate: 1000, P1: 100, P2: 80 })
    const r1 = sizeCase(oc, v, gas({ Z: 1 }))
    const r2 = sizeCase(oc, v, gas({ Z: 2 }))
    const ratio = (r2.CvRequired as number) / (r1.CvRequired as number)
    expect(ratio).toBeCloseTo(Math.SQRT2, 3)
  })
})

// ─── 16-S1 non-convergence ───

describe("16-S1 solver non-convergence", () => {
  it("pathological fittings+viscous → converged:false, NOCONV warnings, no crash", () => {
    const v = valve({
      unitSystem: "metric_kpa",
      valveSize: 100,
      lineSizeUpstream: 20,
      lineSizeDownstream: 20,
      fittings: "reducers",
      FL: 0.98,
      Fd: 0.07,
    })
    const f = liquid({ Gf: 1, Pv: 1, Pc: 22104, kinematicViscosity: 13.38 })
    const oc = caseOf({ flowRate: 50, P1: 1000, P2: 100 })
    const r = sizeCase(oc, v, f)
    expect(r.converged).toBe(false)
    expect(
      r.warnings.some((w) => w.code === "WARN_FP_NOCONV" || w.code === "WARN_FR_NOCONV"),
    ).toBe(true)
    // Result object still returned (no throw / infinite loop).
    expect(r).toBeTruthy()
    expect(r.iterations).toBeGreaterThan(0)
  })
})

// ─── 16-X intercepts ───

describe("16-X intercepts & conversions", () => {
  it("two_phase → suppressed payload", () => {
    const v = valve()
    const f: FluidProps = { fluidType: "two_phase" }
    const { result } = computeResult(input(v, f, [caseOf()]))
    expect(result?.cases[0].CvRequired).toBeNull()
    expect(result?.cases[0].converged).toBe(false)
    expect(result?.cases[0].warnings.some((w) => w.code === "WARN_TWO_PHASE")).toBe(true)
    expect(result?.status).toBe("error")
  })

  it("Cv ↔ Kv round-trips (Cv = 1.156·Kv)", () => {
    expect(kvToCv(cvToKv(50))).toBeCloseTo(50, 6)
    expect(kvToCv(1)).toBeCloseTo(1.156, 6)
  })

  it("gauge → absolute conversion", () => {
    expect(toAbsolute(0, "gauge", "metric_kpa")).toBeCloseTo(101.325, 3)
    expect(toAbsolute(100, "absolute", "metric_kpa")).toBe(100)
    expect(toAbsolute(0, "gauge", "US")).toBeCloseTo(14.6959, 3)
  })

  it("steam → WARN_STEAM, no Cv", () => {
    const r = sizeCase(caseOf(), valve(), { fluidType: "steam" })
    expect(r.CvRequired).toBeNull()
    expect(r.warnings.some((w) => w.code === "WARN_STEAM")).toBe(true)
  })
})

// ─── WarnCode coverage (remaining codes) ───

describe("WarnCode coverage", () => {
  it("WARN_FLASHING when P2 ≤ Pv", () => {
    const r = sizeCase(
      caseOf({ flowRate: 22.712, P1: 300, P2: 50 }),
      valve({ unitSystem: "metric_kpa" }),
      liquid({ Pv: 80, Pc: 22104 }),
    )
    expect(r.warnings.some((w) => w.code === "WARN_FLASHING")).toBe(true)
  })

  it("WARN_CAVITATION near (but below) choke", () => {
    // Choose dPActual in [0.8·dPChoked, dPChoked). dPChoked = FL²(P1−FF·Pv).
    const v = valve({ unitSystem: "metric_kpa", FL: 0.9 })
    const f = liquid({ Pv: 5, Pc: 22104 })
    // P1=200, Pv=5 → FF≈0.9558, dPChoked≈0.81·(200−4.78)=158.1; pick dPActual≈140 (88.5%).
    const r = sizeCase(caseOf({ flowRate: 10, P1: 200, P2: 60 }), v, f)
    expect(r.warnings.some((w) => w.code === "WARN_CAVITATION")).toBe(true)
    expect(r.warnings.some((w) => w.code === "WARN_LIQ_CHOKED")).toBe(false)
  })

  it("WARN_FITTINGS when line size differs from valve size", () => {
    const v = valve({ unitSystem: "metric_kpa", valveSize: 25, lineSizeUpstream: 50, lineSizeDownstream: 50 })
    const r = sizeCase(caseOf({ flowRate: 22.712, P1: 689, P2: 620 }), v, liquid())
    expect(r.warnings.some((w) => w.code === "WARN_FITTINGS")).toBe(true)
  })

  it("WARN_VELOCITY for excessive liquid outlet velocity", () => {
    const v = valve({ unitSystem: "metric_kpa", valveSize: 10, lineSizeUpstream: 10, lineSizeDownstream: 10 })
    const r = sizeCase(caseOf({ flowRate: 50, P1: 689, P2: 620 }), v, liquid())
    expect(r.warnings.some((w) => w.code === "WARN_VELOCITY")).toBe(true)
  })

  it("WARN_Z_DEFAULTED when gas Z omitted", () => {
    const r = sizeCase(
      caseOf({ flowMode: "volumetric_standard", flowRate: 1000, P1: 100, P2: 80 }),
      valve({ unitSystem: "metric_kpa", xT: 0.7 }),
      { fluidType: "gas", M: 29, k: 1.4 },
    )
    expect(r.warnings.some((w) => w.code === "WARN_Z_DEFAULTED")).toBe(true)
  })

  it("WARN_GAUGE when gauge pressure resolves to non-positive absolute", () => {
    const r = sizeCase(
      caseOf({ P1: -150, P1Basis: "gauge", P2: -160, P2Basis: "gauge" }),
      valve({ unitSystem: "metric_kpa" }),
      liquid(),
    )
    expect(r.warnings.some((w) => w.code === "WARN_GAUGE")).toBe(true)
  })

  it("WARN_DP_NONPOS when ΔP ≤ 0", () => {
    const r = sizeCase(
      caseOf({ P1: 200, P2: 200 }),
      valve({ unitSystem: "metric_kpa" }),
      liquid(),
    )
    expect(r.warnings.some((w) => w.code === "WARN_DP_NONPOS")).toBe(true)
  })

  it("travel bands: oversized / near-open / undersized", () => {
    const curve = [
      { travelPercent: 0, cv: 0 },
      { travelPercent: 50, cv: 50 },
      { travelPercent: 100, cv: 100 },
    ]
    expect(travelWarnings(travelPercentForCv(5, curve, "linear"))).toContain("WARN_OVERSIZED")
    expect(travelWarnings(travelPercentForCv(90, curve, "linear"))).toContain("WARN_NEAR_OPEN")
    expect(travelWarnings(travelPercentForCv(150, curve, "linear"))).toContain("WARN_UNDERSIZED")
  })
})
