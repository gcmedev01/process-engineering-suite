/**
 * Warning catalogue — exact human strings + severities (spec §12).
 * Never suppress a warning; index.ts maps error-severity ones to ValidationIssues.
 */
import type { EngineWarning, WarnCode } from "@/types"

interface WarnDef {
  message: string
  severity: EngineWarning["severity"]
}

export const WARNINGS: Record<WarnCode, WarnDef> = {
  WARN_GAUGE: {
    message: "Pressure input appears to be gauge but absolute pressure is required.",
    severity: "error",
  },
  WARN_DP_NONPOS: { message: "ΔP is zero or negative.", severity: "error" },
  WARN_LIQ_CHOKED: { message: "Liquid flow is choked.", severity: "warning" },
  WARN_GAS_CHOKED: { message: "Gas/vapor flow is choked.", severity: "warning" },
  WARN_FLASHING: { message: "Flashing condition detected.", severity: "warning" },
  WARN_CAVITATION: { message: "Cavitation risk requires manufacturer data.", severity: "warning" },
  WARN_VISCOUS: { message: "Viscous or non-turbulent liquid flow detected.", severity: "info" },
  WARN_FITTINGS: {
    message: "Fittings are present; installed correction factors are required.",
    severity: "info",
  },
  WARN_FP_NOCONV: { message: "Fp calculation did not converge.", severity: "error" },
  WARN_FR_NOCONV: { message: "Fr calculation did not converge.", severity: "error" },
  WARN_OVERSIZED: { message: "Selected valve is oversized at minimum flow.", severity: "warning" },
  WARN_NEAR_OPEN: {
    message: "Selected valve is near full open at maximum flow.",
    severity: "warning",
  },
  WARN_UNDERSIZED: {
    message: "Undersized valve: required travel exceeds full open.",
    severity: "error",
  },
  WARN_VELOCITY: { message: "Outlet velocity may be excessive.", severity: "warning" },
  WARN_NOISE: { message: "Noise calculation not implemented.", severity: "info" },
  WARN_STEAM: { message: "Steam sizing is not implemented.", severity: "error" },
  WARN_TWO_PHASE: {
    message: "Two-phase/slurry/non-Newtonian service is outside standard method.",
    severity: "error",
  },
  WARN_Z_DEFAULTED: {
    message: "Compressibility Z was not provided; defaulted to 1.0.",
    severity: "info",
  },
}

export function makeWarning(code: WarnCode): EngineWarning {
  const def = WARNINGS[code]
  return { code, message: def.message, severity: def.severity }
}
