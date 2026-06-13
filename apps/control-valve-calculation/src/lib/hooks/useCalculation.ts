import { useMemo } from "react"
import type { Control } from "react-hook-form"
import { useWatch } from "react-hook-form"
import { calculationInputSchema } from "../validation/inputSchema"
import { computeResult } from "../calculations"
import type { CalculationInput, CalculationResult, DerivedGeometry, ValidationIssue } from "@/types"

interface UseCalculationReturn {
  calculationResult: CalculationResult | null
  derivedGeometry: DerivedGeometry | null
  validationIssues: ValidationIssue[]
}

export function useCalculation(control: Control<CalculationInput>): UseCalculationReturn {
  const formValues = useWatch({ control })

  return useMemo(() => {
    // 1. Zod schema check (types & required rules)
    const activeValues = formValues as Partial<CalculationInput>
    const parsed = calculationInputSchema.safeParse(activeValues)

    if (!parsed.success) {
      // Missing primitive data
      const zodIssues: ValidationIssue[] = parsed.error.issues.map((i) => ({
        code: "ZOD",
        message: i.message,
        severity: "error",
        field: i.path.join("."),
      }))

      return {
        calculationResult: null,
        derivedGeometry: null,
        validationIssues: zodIssues,
      }
    }

    // 2. Physics / engineering rules check + actual calculation
    const inputPayload = parsed.data as CalculationInput
    const { result, derivedGeometry, issues } = computeResult(inputPayload)

    return {
      calculationResult: result,
      derivedGeometry,
      validationIssues: issues,
    }
  }, [formValues])
}
