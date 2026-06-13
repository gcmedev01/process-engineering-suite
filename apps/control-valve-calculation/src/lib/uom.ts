/**
 * Unit-of-measure constants for the control valve calculator.
 *
 * The engine computes in a fixed metric base (kPa absolute, mm, m³/h / Nm³/h /
 * kg/h, cSt, °C). Form state is always stored in these base units; per-field
 * dropdowns convert display↔base in the UI only (see UomInput). Gauge pressure
 * entry is handled by choosing a gauge unit (kPag/barg/psig) — convertUnit
 * applies the atmospheric shift, so the stored value stays absolute kPa.
 */
export { UOM_OPTIONS, UOM_LABEL } from "@eng-suite/engineering-units"

/** Categories this app exposes a unit selector for. */
export type CvUomCategory =
  | "length"
  | "pressure"
  | "absolutePressure"
  | "volumeFlow"
  | "ventRate"
  | "massFlow"
  | "kinematicViscosity"
  | "density"
  | "temperature"

/** Base unit per category — what form state always stores. */
export const CV_BASE_UNITS: Record<CvUomCategory, string> = {
  length: "mm",
  pressure: "kPa", // absolute
  absolutePressure: "kPa", // used for differences (ΔP) — ratio-only units, no gauge shift
  volumeFlow: "m3/h",
  ventRate: "Nm3/h",
  massFlow: "kg/h",
  kinematicViscosity: "cSt",
  density: "kg/m3",
  temperature: "C",
}
