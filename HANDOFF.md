# PES Coding Structure — HANDOFF

Date: 2026-05-04
Author: Maetee Lorprajuksiri

---

## 1. Monorepo Topology

Turborepo + Bun monorepo, dividing into three physical zones:

```
process-engineering-suite/
├── apps/           # Next.js 16 frontend apps (10 apps)
├── packages/       # Shared TS/JS packages (8 packages)
├── services/       # Python backend and calc engines
│   ├── api/             # FastAPI backend (27 Python files)
│   ├── calc-engine/     # Python calculation libraries
│   │   ├── hydraulics/  # Hydraulic calc engine (well-developed, ~40 modules)
│   │   └── pes_calc/    # Vessel/heat transfer/venting calcs (mostly skeleton)
├── infra/          # Docker compose
└── docs/           # Markdown documentation
```

~120K lines of code: 57K TSX, 27K TypeScript, 27K Python.
Pygount reports 146 duplicate files (12.9% of total) — likely from test config repetition or generated artifacts.

---

## 2. Backend (FastAPI + SQLAlchemy Async)

### Layer structure under `services/api/`

```
main.py               # Entrypoint — sys.path.insert + FastAPI app factory
schemas.py            # Pydantic request/response models (hydraulics API)
app/
  config.py           # Settings from DATABASE_URL, USE_MOCK_DATA, etc.
  database.py         # Async SQLAlchemy engine + session factory + health check
  dependencies.py     # FastDI injection: DAL with DB/mock fallback
  models/             # SQLAlchemy ORM models (30+ tables)
  routers/            # FastAPI route handlers (13 routers, grouped by domain)
  services/           # Business logic + data access
    dal.py            # Abstract DataAccessLayer interface
    db_service.py     # PostgreSQL implementation (2K+ lines, covers all 30+ entities)
    mock_service.py   # In-memory mock data for development
    equipment_subtypes.py
    process_design_agents/   # LangGraph AI agent framework (sub-project)
```

### Key patterns

- **Mixin composition**: models combine `UUIDPrimaryKeyMixin`, `TimestampMixin`, `SoftDeleteMixin` from `models/base.py`
- **UUIDs as strings**: `UUID(as_uuid=False)` consistently across all models
- **Abstract DAL**: `DataAccessLayer` interface with `DatabaseService` and `MockService` implementations
- **DI injection**: `DAL = Annotated[DataAccessLayer, Depends(get_dal)]` — auto-selects DB or mock
- **DB fallback**: no DATABASE_URL or failed connection → falls back to MockService transparently
- **Versioned calculations**: `Calculation` ↔ `CalculationVersion` pattern with JSONB snapshots
- **Alembic**: 36+ migrations at `alembic/versions/`, well-named by date and purpose

### Structural concerns in backend

- **`db_service.py` at 2K+ lines** — monolithic god class handling CRUD for all 30+ entity types. Needs decomposition by domain.
- **`process_design_agents/` is a sub-project** — LangGraph agent framework with its own CLI, sizing tools, unit converters, and tests, embedded inside the API service. Should be its own microservice.
- **`main.py` sys.path hack** — `sys.path.insert(0, str(PROJECT_ROOT / "services/calc-engine/hydraulics"))` on line 18. Makes the API non-importable as a library.
- **Thin test layer** — only 9 test files in `services/api/tests/`, heavily PSV-focused. The `db_service.py` monolith, mock service, and most routers have no tests.

---

## 3. Calc Engine Duplication

Two separate hydraulics packages exist:

1. **`services/calc-engine/hydraulics/`** — The real deal. Models (pipe sections, fluid, topology, network), calculators (elevation, fittings, valves, orifices, gas flow), solvers (network, system), optimizer, IO, CLI, 30+ test files. This is the canonical engine.

2. **`packages/hydraulics/`** — **Empty directory**. Exists in the monorepo workspace but contains zero files.

The calc engine is accessed via `sys.path.insert` in `main.py`, not as a proper Python package. You cannot `pip install` it.

**`services/calc-engine/pes_calc/`** — Largely skeleton `__init__.py` stubs for vessels, heat_transfer, venting, rotating. Only `pes_calc/vessels/` has real implementation (15+ vessel head geometry calculators for horizontal/vertical, conical/elliptical/hemispherical/torispherical/flat).

---

## 4. Frontend Architecture

### 10 Next.js 16 apps (App Router)

| App | Port | Purpose |
|-----|------|---------|
| `web` | 3000 | Dashboard hub — reverse-proxies all others |
| `docs` | — | Documentation portal |
| `network-editor` | 3002 | Piping network editor |
| `psv` | 3003 | Pressure relief valve management (heaviest app) |
| `design-agents` | 3004 | AI design agents UI |
| `venting-calculation` | 3005 | Venting/relief system |
| `vessels-calculation` | 3006 | Vessel sizing |
| `pump-calculation` | 3007 | Pump sizing |
| `heat-transfer-calculation` | 3008 | Heat exchanger design |
| `control-valve-calculation` | 3009 | Control valve sizing |
| `calculation-template` | — | Starter/template app |

### Common app pattern

```
src/
  app/              # App Router pages (layout.tsx, page.tsx, providers.tsx)
  components/       # UI components (MUI v7 + sx prop)
  contexts/         # React contexts (ColorModeContext)
  hooks/            # Custom hooks
  lib/              # API clients, utilities, business logic
  store/            # Zustand stores
  data/             # Types, mock data
```

### Shared npm packages (`@eng-suite/*`)

| Package | Purpose |
|---------|---------|
| `@eng-suite/types` | `.d.ts` type declarations |
| `@eng-suite/ui-kit` | iOS-style components, glass styles |
| `@eng-suite/api-std` | API standards, PSV sizing, unit conversion |
| `@eng-suite/engineering-units` | Unit system management |
| `@eng-suite/physics` | Physics calculation engine (TypeScript) |
| `@repo/eslint-config` | Shared ESLint config |
| `@repo/typescript-config` | Shared TS config |

### Frontend stack

- React 19, Next.js 16 (App Router)
- MUI v7 (Material UI)
- Framer Motion for animations
- Zustand for state management
- Vitest for testing

### Frontend concerns

- **App proliferation** — 10 apps for what could be 3-4 feature domains. Each duplicates layout, providers, ColorModeContext, TopToolbar.
- **No shared state between apps** — each app manages its own Zustand stores (auth, PSV data, etc.). No cross-app state synchronization.
- **Apps/web is a reverse proxy** — rewrites sub-paths to other apps' dev servers. All dependent apps must be running simultaneously in development.

---

## 5. AI Agent Framework

`services/api/app/services/process_design_agents/` is a **LangGraph-based multi-agent system** with:

- **12 specialized agents**: process requirements analyst, innovative/conservative researchers, concept detailer, component list researcher, design basis analyst, flowsheet design agent, equipment/stream catalog agent, stream property estimator, equipment sizing agent, cost estimator, safety/risk analyst, project manager
- **LangGraph state machine**: strict sequential node ordering (12 steps), shared `DesignState` with typed fields
- **Self-contained CLI**: `standalone/cli/main.py` with Typer UI, Rich console rendering
- **Own tooling**: sizing helpers, unit converters, JSON repair utilities, XML prompt templates
- **Own test suite**: `standalone/tests/`
- **Documentation**: `standalone/AGENTS.md` details the full agent graph workflow

This is effectively a **separate application** embedded inside the API service.

---

## 6. Infrastructure

- **Docker Compose** at `infra/docker-compose.yml`: one container for all apps (Bun + Turbo), API container (FastAPI + Uvicorn), Postgres container (17-alpine)
- **Deployment**: supports both Vercel and AWS targets via `check:deploy:vercel` and `check:deploy:aws` npm scripts
- **Root configs**: `turbo.json` (build/lint pipeline), `tsconfig.json`, `package.json` (Bun 1.3.5, workspaces)

---

## 7. Key Structural Issues

1. **Calc engine not installable** — `services/calc-engine/hydraulics` accessed via `sys.path.insert`. Needs proper `pyproject.toml` + `pip install -e .`.

2. **Ghost package** — `packages/hydraulics/` is an empty directory registered in the workspace. Confusing.

3. **Overloaded API service** — `db_service.py` is a 2K-line god class. `process_design_agents` is a sub-project. Both should be extracted.

4. **Python outside workspace** — Turborepo manages JS/TS only. Python parts (`services/api/`, `services/calc-engine/`) are not part of the build pipeline. The `pyproject.toml` UV workspace is incomplete.

5. **Duplicate unit converters** — `packages/unit-converter/` and `services/api/app/services/process_design_agents/utils/unit_converter/`. Both are Python; the embedded copy is the one in use, while `packages/unit-converter/` currently has zero consumers (kept for future backend use — see its `README.md`). Neither is a frontend converter; TS apps use `@eng-suite/physics` / `@eng-suite/engineering-units`.

6. **146 duplicate files** — likely from repeated test config styles or generated boilerplate across the 10 apps.

7. **Thin API test coverage** — 9 test files for a 30+ model, 13+ router, 2K-line service layer.

8. **Browser compatibility** — Single-bun-web-app Docker strategy means all apps share one Node process. If one app crashes, the entire dev environment goes down.

---

## 8. db_service.py Decomposition Plan

Saved 2026-05-04, not yet executed.

### Problem

`app/services/db_service.py` is 2,034 lines, one class, 50 public methods across ~15 domain areas. It is a god class.

### Proposed Structure

```
services/
  __init__.py               # exports all service classes, provides DataServices composite
  base.py                   # Generic CRUD helpers (_get_all, _get_by_id, _create, _update, _delete)
  calculation_service.py    # Calculations + CalculationVersions (12 methods)
  hierarchy_service.py      # Customer/Plant/Unit/Area/Project CRUD (20 methods)
  psv_service.py            # Protective systems + scenarios + sizing cases (15 methods)
  equipment_service.py      # Equipment + equipment links + subtypes (8 methods)
  supporting_service.py     # Attachments + Notes + Comments + Todos (12 methods)
  revision_service.py       # Revision history (5 methods)
  audit_service.py          # Audit logs (4 methods)
  venting_service.py        # Venting calculations (6 methods)
  engineering_service.py    # Network designs + design agent sessions + engineering objects (6 methods)
  user_service.py           # Users + credentials (4 methods)
  seed_service.py           # Seed data (1 method)
```

### How It Connects

`services/__init__.py` re-exports all services. `dependencies.py` `get_dal()` returns a composite container:

```python
class DataServices:
    def __init__(self, session: AsyncSession):
        self.users = UserService(session)
        self.hierarchy = HierarchyService(session)
        self.psv = PsvService(session)
        self.calculations = CalculationService(session)
        # ... etc

DAL = Annotated[DataServices, Depends(get_dal)]
```

Routers change from `await dal.get_protective_systems(area_id)` to `await dal.psv.get_protective_systems(area_id)`.

### Migration Strategy

**Phase 1:** Extract one domain at a time, keep old `DatabaseService` delegating to new services via composition. Tests pass at every step.

**Phase 2:** Remove `DatabaseService`, wire `DataServices` directly.

### Estimate

5-6 hours single pass, or 1 hour per domain spread across sprints. Hardest: PSV (complex joins, soft-delete logic). Easiest: Hierarchy, Users, Supporting.
