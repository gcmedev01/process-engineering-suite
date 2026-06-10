# apps/psv

Next.js app for Pressure Safety Valve (PSV) sizing, management, and documentation. Runs on **port 3003**.

## Commands

```bash
bun run dev          # start dev server (port 3003)
bun run build        # production build
bun run test         # vitest
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=psv`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **MUI v7** — all UI components; `sx` prop for styling
- **Zustand** — global state (`src/store/`)
- **Vitest + Testing Library** — tests (`src/lib/__tests__/`)
- **jsPDF / xlsx** — document/report export
- **KaTeX** — equation rendering for relief scenarios

## Structure

```
src/
  app/           # Next.js App Router pages & layouts
  components/    # Feature components (62 dirs) — main PSV management UI
  contexts/      # React contexts
  hooks/         # Custom hooks
  lib/
    api.ts       # PSV-specific API client
    api521.ts    # API-521 fire exposure calculations
    apiClient.ts # Generic API client
    vesselCalculations.ts  # Wetted area from vessel geometry
    equipmentConversion.ts # Unit conversions for PSV equipment
    hydraulicNetworkUtils.ts
    hydraulicValidation.ts
    inputValidation.ts
    physicsValidation.ts
    auditLogService.ts
    permissions.ts
    statusColors.ts
    projectUnits.ts
  store/         # Zustand stores
  templates/     # Report/document templates
```

## What It Does

PSV is a full lifecycle management system for protective safety systems — not just a sizing calculator. It tracks PSVs from selection through installation and maintenance.

**Core capabilities:**
- Hierarchy browser: Area → Equipment → PSV/tag hierarchy
- PSV sizing: API-521 fire case, hydraulic scenarios, conventional vs balanced bellows
- Revision tracking: Every change logged with author, timestamp, reason
- Document export: PDF and Excel reports
- Conflict detection: Multiple PSVs on same service flagged
- Active viewer tracking: See who's editing what in real-time

## Calculation Scope

### API-521 Fire Exposure

```typescript
// Q = 43,200 × F × A^0.82 (liquids, with drainage/fire-fighting)
// Q = 21,000 × F × A^0.82 (no drainage)
calculateFireHeatAbsorption(wettedArea: number, environmentalFactor: number, drainageAndFireFighting: boolean): number
calculateFireReliefRate(heatAbsorption: number, latentHeat: number): number
```

**Environmental factors (API-521 Table 4.4.1):**
| Type | Factor |
|------|--------|
| Bare steel | 1.0 |
| Insulated (50-100mm) | 0.3 |
| Water spray | 0.15 |
| Insulated + water spray | 0.075 |
| Buried | 0.0 |

Wetted area capped at 7.62m (25 ft) per API-521.

### Hydraulic Calculations

`src/lib/hydraulicNetworkUtils.ts` — models PSV as node in hydraulic network with:
- Upstream pressure, downstream back-pressure (constant + variable)
- Relieving pressure, cold differential test pressure
- Capacity correction factors (back-pressure, temperature, compatibility)

### Vessel Integration

`src/lib/vesselCalculations.ts` — computes wetted surface area from vessel geometry:
```typescript
calculateFireExposureArea(vesselGeometry, isProtected): number
```

Accepts vertical/horizontal vessel, torispherical/F&D heads, liquid level. Links to `vessels-calculation` app for vessel geometry inputs.

## Key Pages / Components

| Component | Purpose |
|-----------|---------|
| `HierarchyBrowser` | Tree view: Area → System → Equipment → PSV/tag |
| `ProtectiveSystemList` | Table of all PSVs with status, revision, owner |
| `ProtectiveSystemDetail` | Single PSV detail — sizing, scenarios, documentation |
| `CaseConsiderationPage` | Selects relieving scenarios (fire, blocked outlet, etc.) |
| `HydraulicReportDialog` | Shows hydraulic network analysis results |
| `RevisionHistoryTable` | Audit trail of all changes |

## Formula Fidelity Status

- **API-521 fire formulas:** ✅ 8/8 cases pass. Q = 43,200×F×A^0.82 confirmed (dev < 0.1%). Relief rate confirmed: m = Q×3.6/λ. ENVIRONMENTAL_FACTORS confirmed (BARE=1.0, INSULATED=0.3, WATER_SPRAY=0.15, INSULATED_WITH_WATER=0.075). Tolerance 10%.
- **Wetted area:** Geometry from `vesselCalculations.ts` — linked to vessels-calculation app geometry engine. ✅ Verified against math derivation.
- **Hydraulic calculations:** Back-pressure correction factors per API 520/521. Not yet validated against external reference.

## Pending

- [x] Formula fidelity validation — 8 tests pass (API-521, tolerance 10%)
- [ ] Full API-520 Sizing (API-521 covers fire; full liquid/gas/vapor sizing scenarios)
- [ ] Save/load via shared `/calculations` API
- [ ] Equipment linking with vessels-calculation

## Notes

- `basePath` is `/psv`
- Large MUI-based app (62 component dirs) — older than other calculation apps
- API calls proxy to `services/api` (port 8000)
- Shared types from `@eng-suite/types` and calculation utilities from `@eng-suite/physics`
- Revision system: every save creates a new revision record with change reason
- Conflict detection: tracks if multiple users edit same PSV simultaneously