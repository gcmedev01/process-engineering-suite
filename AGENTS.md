# AI Agent Guidelines for Process Engineering Suite

This document provides build commands, testing procedures, and code style guidelines for agentic coding assistants working in this monorepo.

## Build Commands

**Always use `bun` instead of `npm` or `yarn`**

### Root Level (Monorepo)

```bash
# Build all packages and apps
bun turbo run build

# Run all linters across the project
bun turbo run lint

# Check TypeScript types everywhere
bun turbo run check-types

# Format code
bun run format

# Run development servers for apps, excluding the calculator template
bun turbo run dev --parallel --filter=!calculation-template

# Validate deployment lane compatibility (Vercel + AWS)
bun run check:deploy:matrix
```

## Deployment Lanes (Vercel + AWS)

- Treat deployment config as lane-based. Use `DEPLOY_TARGET=vercel` on Vercel and `DEPLOY_TARGET=aws` on AWS.
- Keep platform differences in environment variables and infra files (`infra/**`, root `Dockerfile`), not in shared hardcoded app behavior.
- Do not hardcode production `localhost` in rewrites or API targets.
- Use `API_PROXY_TARGET` (PSV rewrite target), `NEXT_PUBLIC_API_URL` (browser API URL), and `DOCS_URL` / `NETWORK_EDITOR_URL` / `PSV_URL` / `DESIGN_AGENTS_URL` (web cross-app rewrites).
- For any deployment-related change, run `bun run check:deploy:matrix` before merging.

### TypeScript/Next.js Apps (apps/psv, apps/network-editor, apps/docs)

```bash
# Build specific app (run from app directory)
bun run build

# Run development server
bun run dev

# Lint code
bun run lint

# Type check
bun run check-types

# Run tests (Vitest)
bun run test              # Watch mode
bun run test:run          # Single run

# Run a single test file
TMPDIR=./.tmp vitest run path/to/test.test.tsx

# Run tests matching a pattern
TMPDIR=./.tmp vitest run -t "test name or pattern"
```

### Python Packages (services/calc-engine/hydraulics, services/calc-engine)

```bash
# From package directory
ruff check .              # Lint
ruff format .             # Format
mypy                      # Type checking
pytest                    # Run tests
pytest -v tests/test_specific.py  # Run single test file
pytest tests/test_specific.py::test_name  # Run specific test
pytest -k "pattern"       # Run tests matching pattern
```

## Code Style Guidelines

### TypeScript

- **Imports**: Named exports only (`export {MyClass}`), no default exports. Use ES6 modules
- **Variables**: `const` by default, `let` only when reassignment is needed. Never `var`
- **Types**: Strict mode enabled. Avoid `any`; prefer `unknown` or specific types. Be explicit for complex types
- **Units/UOM**: Never hardcode unit conversions. Always use `convertUnit` from `packages/physics-engine/src/unitConversion.ts`. For display unit selection in forms, use `@eng-suite/engineering-units` — see **UoM System** section below
- **Formatting**: Explicit semicolons, single quotes for strings, template literals for interpolation
- **Naming**:
  - Classes/Interfaces/Types: `UpperCamelCase`
  - Variables/Functions: `lowerCamelCase`
  - Constants: `CONSTANT_CASE`
  - No underscore prefixes for private properties (use `private` modifier)
- **Classes**: Use `readonly` for properties never reassigned outside constructor. Use `private`/`protected` over default `public`
- **Equality**: Always use `===` and `!==`, never `==` or `!=`

### React/Next.js

- **State Management**: Use Zustand for global state, React Context for app-wide settings (e.g., Theme)
- **UI Components**: Use either Material UI (`sx`-driven) or shadcn/ui + Tailwind, based on module-scoped guidance. Follow the nearest scoped `AGENTS.md` for the app you are modifying
- **Glassmorphism**: Import from `@eng-suite/ui-kit`:
  - `glassPanelSx` for panels
  - `liquidGlassBorderSx` for borders
  - `glassInputSx`, `glassSelectSx`, `glassRadioSx` for form elements
- **Theming**: Always use `theme.palette.mode` for conditional dark/light styles
  - Dark: `rgba(255, 255, 255, 0.1)` backgrounds
  - Light: `rgba(0, 0, 0, 0.05)` backgrounds
- **Input Panels**: Use iOS-style deferred commit inputs in Network Editor:
  - `IOSQuantityPage` - Numbers with/without units (Enter commits, Escape reverts)
  - `IOSTextInputPage` - Text input with deferred commit
  - `IOSPickerPage` - Selection, commits on select
  - Required prop: `onBack={() => navigator.pop()}`
  - Avoid `IOSNumberInputPage` in new code
- **Testing**: Vitest with jsdom environment, Testing Library for component tests
- **No comments**: Do not add comments unless explicitly requested

### Python

- **Imports**: Separate lines, grouped: standard library, third-party, local
- **Formatting**: 4-space indentation (no tabs), 80-100 char line limit (ruff: 100)
- **Naming**:
  - Classes: `PascalCase`
  - Functions/Variables/Modules: `snake_case`
  - Constants: `ALL_CAPS_WITH_UNDERSCORES`
  - Private: `_leading_underscore`
- **Type Annotations**: Required for all public APIs. Use Python 3.10+ type syntax
- **Exceptions**: Never use bare `except:`. Use specific exceptions
- **Docstrings**: Triple double quotes `"""` with one-line summary, `Args:`, `Returns:`, `Raises:` sections
- **No comments**: Do not add comments unless explicitly requested

### Error Handling & Validation

- **Inputs**: Real-time validation with visible error highlighting
- **Warnings**: Show warnings for physically possible but suspicious values
- **Feedback**: Provide detailed context explaining physical/regulatory basis for errors
- **Boundaries**: Use Pydantic models for Python validation; TypeScript types + runtime checks for frontend

## Testing Best Practices

### TypeScript (Vitest)

- Use `describe`, `it`, `expect` from `vitest`
- Use `@testing-library/react` for component tests
- Mock functions with `vi.fn()`
- Test user interactions with `@testing-library/user-event`

### Python (pytest)

- Use descriptive test names: `test_specific_scenario`
- Create helper functions (`make_fluid()`, `make_section()`) for test fixtures
- Use `conftest.py` for shared fixtures
- Write tests for edge cases and error conditions
- Test both success and failure paths

## Performance Standards

- Engineering calculations: <100ms feedback on input changes
- PDF generation: <2 seconds
- Diagramming: Maintain 60fps with large networks
- Optimize calculations to prevent blocking the UI

## Architecture Patterns

### Hydraulic Engine (Python)

- **Models**: Typed dataclasses for fluids, components, pipe sections, outputs, networks
- **Calculators**: Dedicated calculator per loss component (friction, fittings, elevation, valves, orifices, user loss)
- **Solver**: Coordinates per-section calculations, aggregates totals, propagates inlet/outlet states
- **IO Layer**: YAML config input, JSON/CSV output
- **Extension**: Add new calculators by implementing `LossCalculator` protocol

### Frontend

- **App Router**: Next.js App Router for routing
- **State**: Zustand stores with actions for updates
- **API**: REST endpoints from FastAPI backend
- **Shared Types**: Define in shared packages (`packages/physics-engine/src/types.ts`)

## Repository Structure

- `apps/`: Frontend applications (web, docs, network-editor, psv, design-agents, venting-calculation, vessels-calculation, pump-calculation, heat-transfer-calculation, calculation-template)
- `packages/`: Shared packages (api-client, api-std, engineering-units, eslint-config, physics-engine, types, typescript-config, ui, ui-kit, unit-converter). Note: `unit-converter` is a standalone Python package (currently unused); the rest are JS/TS workspaces.
- `infra/`: Docker and infrastructure configs
- `services/`: Backend services (api, calc-engine)

When making changes, always match the existing code style and patterns in the file you're editing. Run `bun run lint` (TypeScript) or `ruff check` (Python) before committing.

# AI Agent Guidelines for Process Engineering Suite (PES)

This document defines **architecture, execution model, build commands, testing procedures, and code style rules**
for automated coding agents (Codex) and human contributors working in this monorepo.

This file is **authoritative**. If any other document conflicts with it, **this file wins**.

---

## Rule Zero (Default Policy)

> **Most calculation logic is fine in TypeScript. Python is used only when explicitly chosen for a domain.**

- TypeScript is the default for UI, calculations, orchestration, APIs, persistence, and visualization
- Python (`services/calc-engine`) is used for domains where it is explicitly chosen — typically for heavy numerical work, existing Python codebases, or cross-domain shared logic
- When a domain uses Python, the nearest scoped `AGENTS.md` must document:
  - scope and ownership
  - verification strategy
  - performance and traceability constraints

---

## High-Level Architecture (Hybrid-by-Design)

```
UI (TypeScript)
  │
  ▼
API / Orchestrator (TypeScript)
  │   JSON / OpenAPI
  ▼
Calculation Engine (Python, optional)
  │
  ▼
Engineering Database
```

### Responsibilities by Layer

| Layer | Language | Responsibilities | Notes |
|---|---|---|---|
| UI / Editors | TypeScript | Input forms, visualization, interaction, calculation logic | Python used only when explicitly chosen for a domain |
| API / Orchestrator | TypeScript | Auth, RBAC, run lifecycle, persistence, reporting | Delegates to Python when domain uses it |
| Calculation Engine | Python | Domain-specific equations, standards, checks | Optional — used only for domains explicitly assigned to Python |
| Database | SQL / Object | Inputs, outputs, provenance, versions | Hidden logic |

### Calculation Persistence Rule

- All new calculator save/load work must use the shared calculation persistence model in `services/api`.
- The current snapshot belongs in `calculations`.
- Immutable audit and restore history belongs in `calculation_versions`.
- New calculator apps must not introduce app-specific primary save/load tables or a parallel database persistence model without an explicit scoped exception documented in the nearest `AGENTS.md`.
- File import/export is allowed as a transport, but it must map into the same canonical saved payload shape used by the shared calculations API.

---

## Execution Model

Python-backed calculations (hydraulics, vessels) use a **worker-based execution model** for scalability. TypeScript-side calculations (venting, pump, heat transfer) run synchronously or via API passthrough.

### Execution Principles

- API threads should avoid long-running engineering calculations unless a scoped exception defines bounded execution.
- Python calculations run in **isolated worker processes** by default.
- Concurrency is **explicitly bounded**
- Excess requests are **queued**, not blocked or rejected

### Execution Flow

```
UI (TypeScript)
  │
  ▼
API / Orchestrator (TypeScript)
  │  - validate schema
  │  - persist input snapshot
  │  - assign calc_id + version
  ▼
Job Dispatch
  │
  ▼
Python Worker Pool (multiprocess)
  │  - deterministic calculation
  │  - units, correlations, checks
  │  - results + provenance
  ▼
API Persistence & Reporting
```

### Concurrency Model

- Process-based workers (not threads)
- Typical sizing:
  - 1 worker per CPU core
  - Start with 2–4 workers per instance
- Queueing is acceptable and preferred over blocking

Engineers may see:
> “Calculating… (queued)”

This is expected behavior.

### Sync vs Async Policy

| Calculation Type | Mode |
|---|---|
| RO sizing, venting, valve sizing | Synchronous |
| Multiphase hydraulics, large networks | Asynchronous (job ID + polling) |

### Forbidden Patterns

- Spawning Python per request
- Undocumented equation duplication across layers
- Blocking API threads with long calculations
- Duplicating formulas across languages

---

## Repository Structure (Authoritative)

```
process-engineering-suite/
├─ apps/                 # Frontend applications (Next.js / Vite)
│  ├─ web/               # Dashboard UI (port 3000)
│  ├─ docs/              # Documentation site (port 3001)
│  ├─ network-editor/    # Network topology editor (port 3002)
│  ├─ psv/               # PSV sizing workflow (port 3003)
│  ├─ design-agents/     # AI design agents (port 3004, Vite)
│  ├─ venting-calculation/ # Tank venting calculator (port 3005)
│  ├─ vessels-calculation/ # Vessel & tank sizing (port 3006)
│  ├─ pump-calculation/  # Pump sizing calculator (port 3007)
│  ├─ heat-transfer-calculation/ # Heat transfer in storage tank (port 3008)
|  ├─ control-valve-calculation/ # Control Valve Sizing (port 3009)
│  └─ calculation-template/ # Template for new calculator apps (port 3900)
│
├─ services/             # Backend services (Python)
│  ├─ api/               # FastAPI REST API (port 8000)
│  └─ calc-engine/       # Core engineering calculations (Python)
│     ├─ hydraulics/     # Full hydraulic network engine
│     └─ pes_calc/       # Domain calculation modules
│        ├─ vessels/     # ★ Vessel volume/surface area (20 modules)
│        ├─ venting/     # Tank venting (stub)
│        ├─ heat_transfer/ # Heat transfer (stub)
│        ├─ rotating/    # Pump & rotating equipment (stub)
│        ├─ valves/      # Control valve, PSV, orifice (stub)
│        ├─ instrument/  # Instrument sizing (stub)
│        ├─ hydraulics/  # Hydraulics integration (stub)
│        ├─ core/        # Shared utilities
│        └─ integrations/ # Cross-domain workflows
│
├─ packages/             # Shared libraries
│  ├─ api-client/        # API client SDKs (@eng-suite/api-client)
│  ├─ api-std/           # API standards and shared contracts (@eng-suite/api-std)
│  ├─ engineering-units/ # ★ Shared UoM constants + store factory (@eng-suite/engineering-units)
│  ├─ eslint-config/     # ESLint shared configuration (@repo/eslint-config)
│  ├─ physics-engine/    # Shared physics helpers + convertUnit (@eng-suite/physics)
│  ├─ types/             # Shared TypeScript types (@eng-suite/types)
│  ├─ typescript-config/ # Shared TS config presets — app.json + base/nextjs/react-library (@repo/typescript-config)
│  ├─ ui/                # Shared UI primitives (@repo/ui)
│  ├─ ui-kit/            # Shared MUI components (@eng-suite/ui-kit)
│  └─ unit-converter/    # Python unit converter (process-eng-unit-converter) — currently unused
│
├─ docs/                 # Architecture documentation
├─ infra/                # Docker and deployment
├─ .github/workflows/    # CI/CD pipelines
└─ AGENTS.md
```

---

## Engineering Scope (Year-1)

Excel calculators being replaced:

- Hydraulics (single-phase via Network Editor, multi-phase via PES)
- Restriction orifice sizing
- Pump calculations
- Control valve sizing
- Vessel and tank sizing
- 2-phase and 3-phase separators
- API 2000 atmospheric / low-pressure tank venting

**PSV sizing is handled by the PSV Suite and integrated, not re-implemented.**

---

## Build Commands

**Always use `bun`. Never `npm` or `yarn`.**

### Root Level (Monorepo)

```bash
bun turbo run build
bun turbo run lint
bun turbo run check-types
bun run format
bun turbo run dev --parallel --filter=!calculation-template
bun run check:deploy:matrix
```

## Deployment Lanes (Vercel + AWS)

- Always preserve both deployment lanes. Configure lane intent via `DEPLOY_TARGET`:
  - `vercel` for Vercel projects
  - `aws` for AWS deployments
  - `local` for local development
- Avoid lane regressions by keeping platform targets env-driven:
  - `NEXT_PUBLIC_API_URL`
  - `API_PROXY_TARGET`
  - `DOCS_URL`, `NETWORK_EDITOR_URL`, `PSV_URL`, `DESIGN_AGENTS_URL`
- Before shipping deployment changes, run `bun run check:deploy:vercel` and `bun run check:deploy:aws` (or `bun run check:deploy:matrix`).

---

### TypeScript / Next.js Apps

```bash
bun run build
bun run dev
bun run lint
bun run check-types
bun run test
bun run test:run
```

> ⚠️ **New App Deployment — basePath Rule**
> Every new calculator app cloned from `apps/calculation-template` ships with `basePath: "/[your-app-name]"` as a placeholder in `next.config.ts`. **You MUST replace this with the correct value before deploying to Vercel.**
>
> If `basePath` doesn't match the deployed URL, the app will 404 on all routes. See `pes-web-dna.md` §14 for the full rule and verification steps.
> Common mistake: copying `next.config.ts` from `venting-calculation` and forgetting to update `basePath`.

---

### Python Calculation Engine

```bash
ruff check .
ruff format .
mypy
pytest
pytest -v tests/test_specific.py
```

---

## Code Style Guidelines

### TypeScript

- Named exports only (no default exports)
- `const` by default, no `var`
- Strict typing; avoid `any`
- Never hardcode unit conversions; use `convertUnit` from `packages/physics-engine/src/unitConversion.ts`
- For user-selectable display units in forms, use `@eng-suite/engineering-units` — see **UoM System** section
- Explicit semicolons, single quotes
- `===` / `!==` only
- **No comments unless explicitly requested**

### React / Next.js

- Zustand for global state
- Material UI (MUI) with `sx`
- Use `@eng-suite/ui-kit` glass styles
- iOS-style deferred commit inputs in Network Editor
- Vitest + Testing Library

---

### Python

- 4-space indentation, max 100 chars
- Type annotations required for public APIs
- No bare `except`
- Docstrings required
- **No comments unless explicitly requested**

---

## Testing Policy

- Golden-case regression tests derived from Excel are mandatory
- Numerical tolerance must be explicit
- CI must fail if results change without a version bump
- API records `calc_id`, `calc_version`, `schema_version` for every run

---

## Performance Standards (User-Perceived)

- Most calculations: < 1 second
- Complex cases: 1–3 seconds
- Queueing acceptable
- Deterministic results > speed

---

## Guidance for Automated Agents (Codex)

When generating or modifying code:

- TypeScript is the default for all layers — UI, calculations, orchestration, persistence
- Python in `services/calc-engine/` is used only when explicitly chosen for a domain
- Respect the worker execution model for Python-backed calculations
- Never duplicate calculation logic without a documented reason and verification plan

---

## UoM System

All user-selectable unit-of-measure logic for frontend apps lives in:

**`packages/engineering-units`** (`@eng-suite/engineering-units`)

### Key exports

```ts
import {
  UOM_OPTIONS,      // available units per category (12 categories)
  BASE_UNITS,       // canonical base unit per category (always stored in form)
  UOM_LABEL,        // ASCII key → unicode display label  ('C' → '°C')
  type UomCategory, // keyof UOM_OPTIONS
  createUomStore,   // Zustand store factory with persist + migrate
} from '@eng-suite/engineering-units'
```

### Architecture rules

| Rule | Detail |
|---|---|
| Form state → **base units always** | `mm`, `kPag`, `C`, `m3/h`, `Nm3/h`, … |
| Conversion is **UI-only** | Happens inside `UomInput` component, never at the API boundary |
| Zod validation → **base units** | Ranges stay consistent; no schema changes when adding display units |
| Unit keys are **ASCII** | `m3/h`, `Nm3/h`, `C`, `kg/cm2g` — never unicode superscripts |

### Adding UoM to a new app

1. Add `"@eng-suite/engineering-units": "*"` to the app's `package.json`
2. Add tsconfig path alias:
   ```json
   "@eng-suite/engineering-units": ["../../packages/engineering-units/src/index.ts"]
   ```
3. Create `src/lib/uom.ts` — re-export from `@eng-suite/engineering-units`, add any app-specific constants
4. Create `src/lib/store/uomStore.ts`:
   ```ts
   import { createUomStore } from '@eng-suite/engineering-units'
   import { BASE_UNITS } from '../uom'
   export const useUomStore = createUomStore('my-app-uom-prefs', BASE_UNITS)
   ```
5. Copy `UomInput.tsx` from `apps/venting-calculation` and adjust the RHF form type
6. Run `bun install` at repo root to link the package

### Reference implementation

`apps/venting-calculation` is the canonical example app with a complete UoM implementation.

---

## Summary

PES is an **engineering system**, not a spreadsheet replacement app.

Correctness, traceability, scalability, and reproducibility take priority over convenience or development speed.
