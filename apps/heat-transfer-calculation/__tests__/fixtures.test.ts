/**
 * Fixture validation test — validates all test fixtures against PES engine.
 * Run: TMPDIR=./.tmp npx vitest run __tests__/fixtures.test.ts
 */
import { readFileSync } from 'fs'
import { calculate } from '../src/lib/calculations'
import { calculatePipe } from '../src/lib/calculations/pipe'
import { calculateHorizontalTank } from '../src/lib/calculations/horizontal-tank'
import { describe, test, expect } from 'vitest'

// ── Load fixtures ──────────────────────────────────────────────────────────────
const ST_CASES: any[] = JSON.parse(readFileSync(
  '/Users/maetee/.openclaw/agents/charlie/workspace/test-data/heat-transfer/storage-tank-cases.json', 'utf8'
))
const PC_CASES: any[] = JSON.parse(readFileSync(
  '/Users/maetee/.openclaw/agents/charlie/workspace/test-data/heat-transfer/pipe-cases.json', 'utf8'
))
const HT_CASES: any[] = JSON.parse(readFileSync(
  '/Users/maetee/.openclaw/agents/charlie/workspace/test-data/heat-transfer/horizontal-tank-cases.json', 'utf8'
))

// ── Tolerance assertion helper ─────────────────────────────────────────────────
function assertTolerance(label: string, computed: number, expected: number, tolerancePct: number) {
  const tol = tolerancePct / 100
  const upper = expected * (1 + tol)
  const lower = expected * (1 - tol)
  // Handle zero expected
  if (expected === 0) {
    expect(computed, `${label}: expected 0 but got ${computed}`).toBe(0)
    return
  }
  expect(
    computed >= lower && computed <= upper,
    `${label}: computed=${computed.toFixed(3)} expected={${expected.toFixed(3)}} ±${tolerancePct}% [${lower.toFixed(3)}, ${upper.toFixed(3)}]`
  ).toBe(true)
}

function assertField(label: string, computed: any, expected: any, tolerance: number) {
  if (typeof computed === 'number' && typeof expected === 'number') {
    assertTolerance(label, computed, expected, tolerance)
  } else if (typeof computed === 'object' && computed !== null) {
    for (const key of Object.keys(expected)) {
      if (key === 'cooling') continue  // complex nested, skip
      assertField(`${label}.${key}`, computed[key], expected[key], tolerance)
    }
  } else {
    expect(computed, label).toEqual(expected)
  }
}

// ── Storage Tank ──────────────────────────────────────────────────────────────
describe('Storage Tank Fixtures', () => {
  for (const c of ST_CASES) {
    test(c.caseId, () => {
      const result = calculate(c.input)
      const exp = c.expected
      const tol = c.tolerance

      assertField('dryWall.uOverall', result.dryWall.uOverall, exp.dryWall.uOverall, tol)
      assertField('dryWall.heatLoss', result.dryWall.heatLoss, exp.dryWall.heatLoss, tol)
      assertField('wetWall.uOverall', result.wetWall.uOverall, exp.wetWall.uOverall, tol)
      assertField('wetWall.heatLoss', result.wetWall.heatLoss, exp.wetWall.heatLoss, tol)
      assertField('roof.uOverall',    result.roof.uOverall,    exp.roof.uOverall,    tol)
      assertField('roof.heatLoss',    result.roof.heatLoss,    exp.roof.heatLoss,    tol)
      assertField('floor.uOverall',   result.floor.uOverall,   exp.floor.uOverall,   tol)
      assertField('floor.heatLoss',   result.floor.heatLoss,   exp.floor.heatLoss,   tol)
      assertField('totalHeatLoss', result.totalHeatLoss, exp.totalHeatLoss, tol)
      assertField('totalArea',     result.totalArea,     exp.totalArea,     tol)
    })
  }
})

// ── Pipe ──────────────────────────────────────────────────────────────────────
describe('Pipe Fixtures', () => {
  for (const c of PC_CASES) {
    test(c.caseId, () => {
      const result = calculatePipe(c.input)
      const exp = c.expected
      const tol = c.tolerance

      assertField('uOverall', result.uOverall, exp.uOverall, tol)
      assertField('heatLoss', result.heatLoss, exp.heatLoss, tol)
      assertField('outletTemp', result.outletTemp, exp.outletTemp, tol)
      assertField('surfaceArea', result.surfaceArea, exp.surfaceArea, tol)
      assertField('internalHTC', result.internalHTC, exp.internalHTC, tol)
      assertField('reynoldsInternal', result.reynoldsInternal, exp.reynoldsInternal, tol)
    })
  }
})

// ── Horizontal Tank ───────────────────────────────────────────────────────────
describe('Horizontal Tank Fixtures', () => {
  for (const c of HT_CASES) {
    test(c.caseId, () => {
      const result = calculateHorizontalTank(c.input)
      const exp = c.expected
      const tol = c.tolerance

      assertField('dryWall.uOverall', result.dryWall.uOverall, exp.dryWall.uOverall, tol)
      assertField('dryWall.heatLoss', result.dryWall.heatLoss, exp.dryWall.heatLoss, tol)
      assertField('wetWall.uOverall', result.wetWall.uOverall, exp.wetWall.uOverall, tol)
      assertField('wetWall.heatLoss', result.wetWall.heatLoss, exp.wetWall.heatLoss, tol)
      assertField('dryHead.uOverall', result.dryHead.uOverall, exp.dryHead.uOverall, tol)
      assertField('dryHead.heatLoss', result.dryHead.heatLoss, exp.dryHead.heatLoss, tol)
      assertField('wetHead.uOverall', result.wetHead.uOverall, exp.wetHead.uOverall, tol)
      assertField('wetHead.heatLoss', result.wetHead.heatLoss, exp.wetHead.heatLoss, tol)
      assertField('totalHeatLoss', result.totalHeatLoss, exp.totalHeatLoss, tol)
      assertField('totalArea',     result.totalArea,     exp.totalArea,     tol)
    })
  }
})
