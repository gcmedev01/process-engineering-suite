/**
 * Zod input schema (spec §5). Validates in BASE units; cross-field rules in
 * .superRefine(). Gates computeResult via the useCalculation hook. The engine
 * re-validates independently and emits WARN_* codes for engineering conditions.
 */
import { z } from "zod"

// UomInput stores NaN (not undefined) when a field is cleared. RHF reverts to
// defaultValues on undefined; NaN avoids that. These helpers preprocess NaN →
// undefined so Zod shows "Required" / treats the field as absent.
const nanToUndef = (v: unknown) =>
  typeof v === "number" && Number.isNaN(v) ? undefined : v

// Required numeric fields
const reqNum = z.preprocess(nanToUndef, z.number({ message: "Required" }))
const posNum = (msg: string) =>
  z.preprocess(nanToUndef, z.number({ message: "Required" }).positive(msg))

// Optional numeric fields — NaN (cleared) is treated as absent (undefined)
const optNum = z.preprocess(nanToUndef, z.number().optional())
const optPosNum = z.preprocess(nanToUndef, z.number().positive().optional())

const metadataSchema = z
  .object({
    projectNumber: z.string().default(""),
    documentNumber: z.string().default(""),
    title: z.string().default(""),
    projectName: z.string().default(""),
    client: z.string().default(""),
  })
  .default({
    projectNumber: "",
    documentNumber: "",
    title: "",
    projectName: "",
    client: "",
  })

const valveConfigSchema = z.object({
  unitSystem: z.enum(["US", "metric_bar", "metric_kpa"]),
  valveType: z.enum(["globe", "globe_angle", "ball", "butterfly", "rotary_plug", "special"]),
  flowCharacteristic: z.enum(["linear", "equal_percentage", "quick_opening"]),
  valveSize: posNum("Valve size must be > 0"),
  lineSizeUpstream: posNum("Upstream line size must be > 0"),
  lineSizeDownstream: posNum("Downstream line size must be > 0"),
  fittings: z.enum(["none", "reducers", "expanders", "custom"]),
  FL: z.preprocess(nanToUndef, z.number().gt(0).lte(1).optional()),
  xT: z.preprocess(nanToUndef, z.number().gt(0).lte(1).optional()),
  Fd: z.preprocess(nanToUndef, z.number().gt(0).lte(1).optional()),
  flowBasis: z.enum(["Cv", "Kv"]),
  cvCurve: z.array(z.object({ travelPercent: z.number(), cv: z.number() })).optional(),
})

const fluidPropsSchema = z.object({
  fluidType: z.enum([
    "liquid",
    "gas",
    "vapor",
    "steam",
    "two_phase",
    "slurry",
    "non_newtonian",
  ]),
  Gf: optPosNum,
  Pv: optPosNum,
  Pc: optPosNum,
  kinematicViscosity: optPosNum,
  M: optPosNum,
  Z: optPosNum,
  k: z.preprocess(nanToUndef, z.number().gte(1).optional()),
  upstreamDensity: optPosNum,
})

const operatingCaseSchema = z
  .object({
    caseName: z.enum(["min", "normal", "max", "design", "custom"]),
    label: z.string().optional(),
    flowMode: z.enum(["volumetric_standard", "volumetric_actual", "mass"]),
    flowRate: posNum("Flow rate must be > 0"),
    P1: reqNum,
    P1Basis: z.enum(["absolute", "gauge"]),
    P2: optNum,
    P2Basis: z.enum(["absolute", "gauge"]).optional(),
    dP: optNum,
    T1: reqNum,
    pAtm: optPosNum,
  })
  .superRefine((c, ctx) => {
    const hasP2 = c.P2 != null
    const hasDp = c.dP != null
    if (!hasP2 && !hasDp) {
      const msg = "Provide outlet pressure (P2) or pressure drop (ΔP)."
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["P2"] })
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["dP"] })
    } else if (hasP2 && hasDp) {
      const msg = "Provide only one: clear P2 or clear ΔP."
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["P2"] })
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["dP"] })
    }
  })

export const calculationInputSchema = z
  .object({
    tag: z.string().min(1, "Tag is required"),
    description: z.string().optional().default(""),
    metadata: metadataSchema,
    valve: valveConfigSchema,
    fluid: fluidPropsSchema,
    cases: z.array(operatingCaseSchema).min(1, "At least one operating case is required"),
  })
  .superRefine((data, ctx) => {
    const fluidType = data.fluid.fluidType

    const isGas = fluidType === "gas" || fluidType === "vapor"

    data.cases.forEach((c, i) => {
      // Inlet density is needed for mass flow (any fluid) and for gas actual-volumetric
      // flow. Liquid volumetric flow is used directly and needs no density.
      const needsDensity =
        c.flowMode === "mass" || (c.flowMode === "volumetric_actual" && isGas)
      if (needsDensity && data.fluid.upstreamDensity == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mass flow (any fluid) and gas actual-volumetric flow require fluid upstream density.",
          path: ["cases", i, "flowMode"],
        })
      }
    })

    // Liquid requires Gf, Pv, Pc.
    if (fluidType === "liquid") {
      for (const key of ["Gf", "Pv", "Pc"] as const) {
        if (data.fluid[key] == null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Liquid sizing requires ${key}.`,
            path: ["fluid", key],
          })
        }
      }
    }

    // Gas/vapor requires M and k. Z defaults to 1.0 (engine warns); xT falls back
    // to the valve-type default (engine pushes an assumption) — neither is forced here.
    if (fluidType === "gas" || fluidType === "vapor") {
      for (const key of ["M", "k"] as const) {
        if (data.fluid[key] == null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Gas/vapor sizing requires ${key}.`,
            path: ["fluid", key],
          })
        }
      }
    }
  })

export type ValidatedInput = z.infer<typeof calculationInputSchema>
