import { z } from "zod"

// Helpers for numeric fields backed by UomInput.
//
// UomInput stores NaN (not undefined) when a field is cleared. RHF reverts a
// field to its defaultValues when it receives undefined — NaN prevents that
// snap-back. Without these helpers Zod would surface "received NaN"; the
// preprocess converts NaN → undefined so Zod shows "Required" instead.
//
// Usage:
//   diameter: posNum("Diameter must be > 0"),   // required + positive
//   flowRate: reqNum,                            // required, any sign
//   viscosity: z.number().positive().optional().or(z.nan().transform(() => undefined)),  // optional
export const reqNum = z.preprocess(
  (v) => (typeof v === "number" && Number.isNaN(v) ? undefined : v),
  z.number({ message: "Required" }),
)
export const posNum = (msg: string) => z.preprocess(
  (v) => (typeof v === "number" && Number.isNaN(v) ? undefined : v),
  z.number({ message: "Required" }).positive(msg),
)

export const calculationInputSchema = z
  .object({
    tag: z.string().min(1, "Tag / equipment number is required"),
    description: z.string().optional().default(""),
    // Add logic-specific validation fields here

    metadata: z.object({
      projectNumber: z.string().default(""),
      documentNumber: z.string().default(""),
      title: z.string().default(""),
      projectName: z.string().default(""),
      client: z.string().default(""),
    }).default({
      projectNumber: "",
      documentNumber: "",
      title: "",
      projectName: "",
      client: "",
    }),
  })
  .superRefine((data, ctx) => {
    // Add cross-field logic here
  })

export type ValidatedInput = z.infer<typeof calculationInputSchema>
