# Claude Code Project Guide: process-engineering-suite

> **Authority**: `AGENTS.md` is the canonical reference for architecture, build commands, code
> style, and execution model. This file adds Claude-specific orientation and structural warnings
> that are not covered there. When the two files conflict, **AGENTS.md wins**.

---

## Quick Orientation

This is a **Turborepo + Bun monorepo** for web-based process engineering calculations.

- **~120K lines of code**: 57K TSX, 27K TypeScript, 27K Python
- **10 Next.js 16 frontend apps** in `apps/`, each a standalone calculator or tool
- **FastAPI backend** at `services/api/` (port 8000) with PostgreSQL via SQLAlchemy async
- **Python calc engine** at `services/calc-engine/` — the real hydraulics engine plus stubs
- **8+ shared packages** under `packages/` with the `@eng-suite/*` npm scope
- **Always use `bun`** — never `npm` or `yarn`

See `AGENTS.md` § "Repository Structure" for the full authoritative directory tree.

---

## Shared Packages Reference

All packages live under `packages/` and are registered as Bun workspaces.

| Directory            | npm name                       | Purpose                                                                                                                                      |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `engineering-units/` | `@eng-suite/engineering-units` | ★ UoM constants, `createUomStore` factory                                                                                                    |
| `physics-engine/`    | `@eng-suite/physics`           | `convertUnit`, `normalizeUnit`, shared TS types                                                                                              |
| `api-std/`           | `@eng-suite/api-std`           | API standards, PSV sizing contracts                                                                                                          |
| `ui-kit/`            | `@eng-suite/ui-kit`            | Glassmorphism MUI components, glass style helpers                                                                                            |
| `types/`             | `@eng-suite/types`             | Generated `.d.ts` type declarations                                                                                                          |
| `api-client/`        | `@eng-suite/api-client`        | Generated API client (do not hand-edit)                                                                                                      |
| `unit-converter/`    | — (Python, not a JS package)   | ⚠️ Python unit converter — currently unused (see warning)                                                                                    |
| `ui/`                | `@repo/ui`                     | Shared UI primitives                                                                                                                         |
| `eslint-config/`     | `@repo/eslint-config`          | Shared ESLint config                                                                                                                         |
| `typescript-config/` | `@repo/typescript-config`      | Shared TS config presets: `app.json` (Next.js/bundler apps + frontend pkgs), `base.json`/`nextjs.json`/`react-library.json` (library builds) |

---

## Known Structural Issues (Read Before Editing)

These are pre-existing problems documented in `HANDOFF.md`. Do not work around them in ways
that deepen the debt. Do not create new instances of the same anti-patterns.

### 1. There is no `packages/hydraulics/`

Despite older references, no `hydraulics` package exists under `packages/` — do not try to
import one. The real hydraulic engine lives at `services/calc-engine/hydraulics/` (~76 Python
modules); use that.

### 2. Calc engine is not pip-installable

`services/calc-engine/hydraulics/` is a full, well-tested engine (~40 modules, 30+ test files)
but it is accessed via a `sys.path.insert` hack in `services/api/main.py` line 18. Do not
add further `sys.path` hacks. The correct fix is a proper `pyproject.toml` + `pip install -e .`
but that refactor is not yet done.

### 3. `db_service.py` is a 2,000-line god class

`services/api/app/services/db_service.py` handles CRUD for all 30+ entity types in one class.
A decomposition plan exists in `HANDOFF.md` § 8 (splitting into domain-scoped service files).
Do not add new methods to this class. If you must add persistence logic, discuss decomposition
first.

### 4. Duplicate unit converters

There are **two** Python unit-converter implementations (neither is a frontend package):

- `packages/unit-converter/` — a standalone Python package (`process-eng-unit-converter`).
  **Currently has zero consumers** — kept for potential future backend use. See its `README.md`
  before wiring it into a service.
- `services/api/app/services/process_design_agents/utils/unit_converter/` — a copy embedded in
  the AI agents sub-project; this is the one actually imported today.

Do **not** create a third. **For frontend use, neither of these applies** — always reach for
`convertUnit` from `packages/physics-engine/src/unitConversion.ts` (numeric math) or
`@eng-suite/engineering-units` (UoM store + display). See the UoM section below.

### 5. `process_design_agents/` is an embedded sub-project

`services/api/app/services/process_design_agents/` is a full LangGraph multi-agent framework
with its own CLI, tooling, tests, and documentation. It is logically a separate microservice
embedded inside the API. Treat it as a black box unless you are specifically working on it.
It has its own `AGENTS.md` inside `standalone/`.

### 6. `pes_calc/` is mostly stubs

`services/calc-engine/pes_calc/` has real implementation only under `pes_calc/vessels/`
(~15 vessel head geometry calculators). The `venting/`, `heat_transfer/`, `rotating/`,
`valves/`, `instrument/`, and `hydraulics/` subdirectories are skeleton `__init__.py` stubs.
Do not assume logic exists there before checking.

---

## Unit of Measure (UoM) System

All user-selectable unit-of-measure logic for frontend apps lives in
**`packages/engineering-units`** (`@eng-suite/engineering-units`).

### Key exports

```ts
import {
    UOM_OPTIONS, // available units per category (12 categories)
    BASE_UNITS, // canonical base unit per category — always stored in form state
    UOM_LABEL, // ASCII key → unicode display label  ('C' → '°C')
    type UomCategory,
    createUomStore, // Zustand store factory with persist + migrate
} from "@eng-suite/engineering-units";
```

### Architecture rules

| Rule                               | Detail                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| Form state → **base units always** | `mm`, `kPag`, `C`, `m3/h`, `Nm3/h`, …                           |
| Conversion is **UI-only**          | Inside `UomInput` component, never at the API boundary          |
| Zod validation → **base units**    | Ranges stay consistent; no schema changes for new display units |
| Unit keys are **ASCII**            | `m3/h`, `Nm3/h`, `C`, `kg/cm2g` — never unicode superscripts    |

### Supported unit families (`packages/physics-engine/src/unitConversion.ts`)

- **Length**: `mm`, `cm`, `m`, `km`, `in`, `ft`, `yd`, `mi`
- **Temperature**: `C`, `F`, `K`, `R`
- **Pressure (absolute)**: `kPa`, `bar`, `psi`, `atm`, `Pa`, `MPa`
- **Pressure (gauge)**: `kPag`, `barg`, `psig`, `kg/cm2g`, `kg/cm2`, `atm`
- **Mass Flow**: `kg/s`, `g/s`, `kg/h`, `kg/hr`, `ton/day`, `lb/s`, `lb/min`, `lb/h`, `lb/hr`
- **Volume Flow**: `m3/s`, `m3/h`, `Nm3/h`, `Nm3/d`, `ft3/h`, `SCFD`, `MSCFD`
- **Viscosity**: `Pa.s`, `Poise`, `cP`
- **Kinematic Viscolity**: `St`, `cSt`, `m2/s`, `ft2/s`, `in2/s`
- **Mass Density**: `kg/m3`, `kg/cm3`, `g/cm3`, `lb/ft3`, `lb/in3`
- **Pressure Gradient**: `Pa/m`, `kPa/100m`, `bar/100m`, `kg/cm2/100m`, `psi/100ft`

### Reference implementation

`apps/venting-calculation` is the canonical UoM-complete app. Copy its patterns:

- `src/lib/uom.ts` — re-exports `@eng-suite/engineering-units` + app-specific constants
- `src/lib/store/uomStore.ts` — `createUomStore('vent-uom-prefs', BASE_UNITS)`
- `src/app/calculator/components/UomInput.tsx` — RHF-controlled input + inline unit selector

### Adding UoM to a new app

1. Add `"@eng-suite/engineering-units": "*"` to the app's `package.json`
2. Add tsconfig path alias:
    ```json
    "@eng-suite/engineering-units": ["../../packages/engineering-units/src/index.ts"]
    ```
3. Create `src/lib/uom.ts` — re-export from `@eng-suite/engineering-units`, add any app-specific extras
4. Create `src/lib/store/uomStore.ts` using `createUomStore('my-app-uom-prefs', BASE_UNITS)`
5. Copy `UomInput.tsx` from `apps/venting-calculation` and adjust the form type
6. Run `bun install` at repo root to link the package

---

## Calculation Persistence

All calculator apps must use the shared persistence model via `services/api`.

- **Current snapshot** → `calculations` table
- **Immutable audit history** → `calculation_versions` table
- **Restore** creates a new latest version from a historical snapshot (never mutates history)
- Apps that already use this model: `pump-calculation`, `vessels-calculation`, `venting-calculation`, `calculation-template`
- Do **not** introduce app-specific save/load tables. File import/export is allowed as a transport but must map to the canonical `calculations` payload shape.

---

## New App Checklist

When cloning from `apps/calculation-template`:

- [ ] Update `basePath` in `next.config.ts` to the correct deployed path (e.g. `/pump`). A wrong `basePath` causes 404s on all routes. See `pes-web-dna.md` §14.
- [ ] Add UoM wiring if the app has unit-bearing inputs (see above)
- [ ] Register the app's port in `apps/web` rewrites
- [ ] Use shared calculation persistence (`/calculations` endpoints), not a local DB table
- [ ] Wire `DEPLOY_TARGET` environment variables for both Vercel and AWS lanes

---

## Backend Quick Reference

```
services/api/
  main.py               # FastAPI app factory + sys.path hack (line 18)
  app/
    config.py           # Settings — DATABASE_URL, USE_MOCK_DATA, etc.
    database.py         # Async SQLAlchemy engine + session factory
    dependencies.py     # DI: get_dal() → DatabaseService or MockService
    models/             # SQLAlchemy ORM (30+ tables)
    routers/            # 13 FastAPI routers grouped by domain
    services/
      dal.py            # Abstract DataAccessLayer interface
      db_service.py     # PostgreSQL impl — 2K lines, god class (see known issues)
      mock_service.py   # In-memory mock for development
      process_design_agents/   # LangGraph AI agent sub-project (treat as black box)
```

Key patterns:

- Models use `UUIDPrimaryKeyMixin`, `TimestampMixin`, `SoftDeleteMixin` from `models/base.py`
- UUIDs stored as `UUID(as_uuid=False)` (strings) throughout
- No `DATABASE_URL` → falls back to `MockService` transparently
- Alembic migrations at `alembic/versions/` (36+ migrations)

---

## Further Reading

| File                            | Contents                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `AGENTS.md`                     | **Authoritative** — architecture, build commands, style rules, execution model |
| `HANDOFF.md`                    | Deep structural analysis, known issues, decomposition plans                    |
| `DEVELOPING.md`                 | Getting started, coding standards, troubleshooting                             |
| `docs/DATABASE_SCHEMA.md`       | Database schema reference                                                      |
| `docs/ENVIRONMENT_VARIABLES.md` | All environment variables                                                      |
| `pes-web-dna.md`                | Web app deployment rules including `basePath`                                  |
