# Process Engineering Suite

A monorepo for process engineering calculations and workflows.

Recent backend change: saved calculations now use a hybrid persistence model with a fast current record plus immutable version history for audit and restore.

## Apps

| App | Port | Description |
|-----|------|-------------|
| `apps/web` | 3000 | Dashboard |
| `apps/docs` | 3001 | Documentation site |
| `apps/network-editor` | 3002 | Hydraulic network editor |
| `apps/psv` | 3003 | PSV sizing workflow |
| `apps/design-agents` | 3004 | AI design agents |
| `apps/venting-calculation` | 3005 | Tank venting calculator |
| `apps/vessels-calculation` | 3006 | Vessel & tank sizing |
| `apps/pump-calculation` | 3007 | Pump sizing calculator |
| `apps/heat-transfer-calculation` | 3008 | Heat transfer in storage tank |
| `apps/control-valve-calculation` | 3009 | Control valve sizing calculator |
| `apps/calculation-template` | 3900 | Template for new calculator apps |

## Backend

| Service | Port | Description |
|---------|------|-------------|
| `services/api` | 8000 | FastAPI REST API |
| `services/calc-engine` | - | Python calculation engine |

## Quick Start

### Local Development (Bun)

```bash
bun install
bun run dev
```

### Docker — dev stack (hot reload, local DB)

```bash
cp infra/.env.example infra/.env
# edit infra/.env and set POSTGRES_PASSWORD

docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build
open http://localhost:3000       # Dashboard
open http://localhost:8000/docs  # API docs
```

See [docs/DOCKER_DEVELOPMENT.md](docs/DOCKER_DEVELOPMENT.md) for logs, health checks, rebuilds, and database reset commands.

### Docker — AWS production images (local smoke test)

Builds production-style images locally and runs them against a local Postgres:

```bash
# 1. Create env file for secrets and build-time URLs
cp infra/.env.aws-local.example infra/.env.aws-local
# edit infra/.env.aws-local — set POSTGRES_PASSWORD etc.

# 2. Build and start the stack
docker compose -f infra/docker-compose.aws-local.yml \
  --env-file infra/.env.aws-local up -d --build

# The AWS image build script uses the same build-time URLs and now covers the
# full suite of AWS-deployed apps. See docs/DEPLOYMENT.md for the render flow.

# 3. Open in browser
open http://localhost:3000                            # Web dashboard
open http://localhost:3001/docs                       # Docs
open http://localhost:3002/network-editor             # Network editor
open http://localhost:3003/psv                        # PSV sizing
open http://localhost:3004/design-agents/             # Design agents (Vite/Nginx)
open http://localhost:3005/venting-calculation        # Venting Calculation
open http://localhost:3006/vessels-calculation        # Vessels Calculation
open http://localhost:3007/pump-calculation           # Pump Calculation
open http://localhost:3008/heat-transfer-calculation  # Heat Transfer Calculation
open http://localhost:3009/control-valve-calculation  # Control Valve Calculation
open http://localhost:8000/docs                       # API docs
```

## Common Commands

```bash
bun run build        # Build all apps
bun run lint         # Lint code
bun run check-types  # Type check
bun run format       # Format code
```

## Calculation Persistence

- Saved calculations now persist through `services/api` in shared `/calculations` endpoints.
- The current snapshot lives in the `calculations` table.
- Immutable audit history lives in the `calculation_versions` table.
- Restore creates a new latest version from a historical snapshot instead of mutating history.
- `apps/pump-calculation`, `apps/vessels-calculation`, `apps/venting-calculation`, and `apps/calculation-template` now use this shared model.
- Legacy venting endpoints remain available as compatibility wrappers backed by the shared calculation store.

## API Verification

```bash
cd services/api
TEST_DATABASE_URL='postgresql+asyncpg://postgres:change-me@127.0.0.1:5432/engsuite_test' PYTHONPATH=. .venv/bin/pytest tests/test_calculation_versioning.py tests/test_venting_metadata.py tests/test_engineering_objects_endpoints.py tests/test_engineering_object_design_parameters.py tests/test_equipment_venting_endpoints.py tests/test_equipment_subtypes.py tests/test_uniqueness_constraints.py tests/test_psv_soft_delete.py -v
```

## Project Structure

```
apps/           # Frontend applications (Next.js / Vite)
├── web/
├── docs/
├── network-editor/
├── psv/
├── design-agents/
├── venting-calculation/
├── vessels-calculation/
├── pump-calculation/
├── heat-transfer-calculation/
├── control-valve-calculation/
└── calculation-template/

services/       # Backend services (Python)
├── api/        # FastAPI REST API (with design-agents logic)
└── calc-engine/

packages/       # Shared libraries
├── api-client/ # Generated API client
├── api-std/    # Standard API definitions
├── physics-engine/ # Calculation logic (frontend unit conversion lives here)
├── engineering-units/ # Shared UoM constants + store factory
├── ui-kit/     # Shared UI components
├── types/      # Shared TypeScript types
├── typescript-config/ # Shared TS config presets
├── unit-converter/ # Standalone Python unit converter (currently unused)
└── ...

infra/          # Docker & deployment config
├── docker-compose.yml            # Dev stack (hot-reload)
├── docker-compose.aws-local.yml  # AWS image smoke-test
├── docker/                       # Dockerfiles (api, frontend, vite/nginx)
└── aws/                          # ECS task definitions + build-and-push script
docs/           # Architecture documentation
```

## Documentation

- [DEVELOPING.md](DEVELOPING.md) - Setup guides
- [docs/DOCKER_DEVELOPMENT.md](docs/DOCKER_DEVELOPMENT.md) - Docker development and AWS-local smoke testing
- [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) - Environment variables
- [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) - Database schema
- [docs/ENGINEERING_OBJECTS_MIGRATION_20260306.md](docs/ENGINEERING_OBJECTS_MIGRATION_20260306.md) - Engineering object and equipment migration notes
- [AGENTS.md](AGENTS.md) - Code conventions

## Tech Stack

- **Frontend**: Next.js, Vite, TypeScript, Tailwind, Bun, Material UI
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic, LangGraph
- **Database**: PostgreSQL
- **Deployment**: Docker, Vercel, AWS ECS/Fargate
