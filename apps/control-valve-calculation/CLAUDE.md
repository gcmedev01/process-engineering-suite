# apps/control-valve-calculation

Next.js app for control valve sizing per **ANSI/ISA-75.01.01-2012 / IEC 60534-2-1**. Runs on **port 3009**.

Scope (first pass): single-phase **liquid** + **gas/vapor**. Steam, two-phase, slurry, and non-Newtonian
service are warning-only stubs (intercepted, never sized with the standard method).

## Commands

```bash
bun run dev          # start dev server (port 3009)
bun run build        # production build
bun run test         # vitest
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=control-valve-calculation`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **Tailwind CSS v4** — primary styling (not MUI's `sx`)
- **shadcn/ui** — component primitives (class-variance-authority)
- **MUI v7** — TopToolbar uses MUI
- **React Hook Form + Zod** — form handling and validation (base-units validation)
- **Zustand** — UoM preference store (`src/lib/store/`)
- **React PDF** — PDF report generation
- **Vitest + Testing Library** — engine tests in `src/lib/calculations/__tests__/`

## Engine

The sizing engine is pure, framework-free TypeScript in `src/lib/calculations/` (no React, no I/O):

| Module | Responsibility |
|--------|----------------|
| `index.ts` | `computeResult(input)` — orchestrates over operating cases; governing case / CvMax |
| `sizeCase.ts` | single-case solver + the unified relaxation loop (Cv ↔ Fp/FLP/xTP ↔ Fr) |
| `units.ts` | N-constant router, Cv/Kv helpers, gauge→absolute / °C→K conversions |
| `liquid.ts` | FF, choked ΔP, sizing ΔP, core liquid Cv |
| `gas.ts` | x, Fk, x-limit, Y (floor 0.667), volumetric + mass Cv |
| `fittings.ts` | ΣK, Fp, FLP, xTP installed-correction factors |
| `reynolds.ts` | Rev + Fr (IEC 60534-2-1 Annex G) |
| `valveSelection.ts` | travel-% interpolation + opening-band checks |
| `screening.ts` | liquid outlet velocity + gas Mach screening |
| `warnings.ts` | WarnCode enum + exact warning message strings |
| `defaults.ts` | FL/xT/Fd typical defaults per valve type/trim (IEC Table 2) |
| `constants.ts` | N-constant tables, FF bounds, Y floor, travel/velocity limits |

## Correctness rules (do not violate)

- `Rev` uses **FL and Ci**, never `Fp·Cv`. N-constants are the self-consistent ISA-75.01.01 set — do not mix editions.
- Never size on actual ΔP when choked — cap at choked ΔP (liquid) / x-limit (gas). Never ignore `Pv` (liquid) or `xT` (gas).
- With fittings present, always apply `Fp` + `FLP`/`xTP`. For viscous service (`Rev < 10000`), always apply `Fr`.
- The relaxation loop is **single and unified** — `Fp`/`FLP`/`xTP` and `Fr` update in the same iteration. Hard cap 500 iterations → `converged:false` + a non-convergence warning, result still returned.
- `Y` floored at 0.667. `FF` clamped `[0, 0.96]`. No gauge pressure inside gas pressure-ratio math.
- Engineering equations live ONLY in `src/lib/calculations/` — never inside React components.

## Notes

- `basePath` is `/control-valve-calculation` (set in `next.config.ts`) — required for correct routing.
- Internal sizing basis is **Cv**; **Kv** is a display conversion (`Cv = 1.156·Kv`).
- Multi-case (min/normal/max/design) is first-class: one valve candidate, N operating cases.
- Save/load uses the shared `/calculations` API (`app: 'control-valve-calculation'`) — not app-specific tables.
- Kinematic viscosity UoM lives in the shared `@eng-suite/engineering-units` `kinematicViscosity` category (base `cSt`).
- API calls proxy to `services/api` (port 8000); registered in `apps/web` rewrites at `/control-valve-calculation`.
