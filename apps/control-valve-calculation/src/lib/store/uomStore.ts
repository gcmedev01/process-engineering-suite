/**
 * UoM preferences store for the control valve calculator.
 *
 * Built with the shared `createUomStore` factory. Persisted to localStorage
 * under 'cv-uom-prefs'; newly-added categories back-fill from CV_BASE_UNITS.
 */
import { createUomStore } from "@eng-suite/engineering-units"
import { CV_BASE_UNITS } from "../uom"

export const useUomStore = createUomStore("cv-uom-prefs", CV_BASE_UNITS)
