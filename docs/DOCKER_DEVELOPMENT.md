# Docker Development Guide

This guide covers running the full local Process Engineering Suite with Docker.

## Compose Files

| File | Purpose |
|---|---|
| `infra/docker-compose.yml` | Daily development stack with hot reload. Runs one Bun app container, one FastAPI API container, and Postgres. |
| `infra/docker-compose.aws-local.yml` | Local smoke test for production-style Docker images. Builds one image per app plus API and Postgres. |

Use `infra/docker-compose.yml` while developing. Use `infra/docker-compose.aws-local.yml` when validating image builds, standalone Next.js output, and production-like container startup.

## Development Stack

### 1. Configure Environment

The development compose file reads `infra/.env`.

```bash
cp infra/.env.example infra/.env
```

Set at least:

```env
POSTGRES_PASSWORD=your-local-password
```

### 2. Start Everything

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env up --build
```

For detached mode:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build
```

This starts:

| Service | Container role | Host ports |
|---|---|---|
| `postgres` | PostgreSQL 17 database | `5432` |
| `api` | FastAPI with Alembic migrations, mock seed, and uvicorn reload | `8000` |
| `apps` | Bun/Turbo dev servers for all frontend apps except `calculation-template` | `3000-3009` |

The API development image uses Python 3.11. Keep it aligned with `infra/docker/Dockerfile.api`; API code may use Python 3.11 standard-library features.

### 3. Open Apps

| App | URL |
|---|---|
| Dashboard | `http://localhost:3000` |
| Docs | `http://localhost:3001/docs` |
| Network Editor | `http://localhost:3002/network-editor` |
| PSV | `http://localhost:3003/psv` |
| Design Agents | `http://localhost:3004/design-agents/` |
| Venting Calculation | `http://localhost:3005/venting-calculation` |
| Vessels Calculation | `http://localhost:3006/vessels-calculation` |
| Pump Calculation | `http://localhost:3007/pump-calculation` |
| Heat Transfer Calculation | `http://localhost:3008/heat-transfer-calculation` |
| Control Valve Calculation | `http://localhost:3009/control-valve-calculation` |
| API docs | `http://localhost:8000/docs` |

### 4. Verify Health

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env ps
docker compose -f infra/docker-compose.yml --env-file infra/.env logs --tail=120 api
```

From the host:

```bash
curl http://localhost:8000/health
```

From inside the API container:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env exec -T api python - <<'PY'
from urllib.request import urlopen
print(urlopen('http://127.0.0.1:8000/health', timeout=5).read().decode())
PY
```

Expected response:

```json
{"status":"healthy","service":"hydraulics-api","database":"connected"}
```

### 5. Common Development Commands

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env logs -f api
docker compose -f infra/docker-compose.yml --env-file infra/.env logs -f apps
docker compose -f infra/docker-compose.yml --env-file infra/.env exec api alembic current
docker compose -f infra/docker-compose.yml --env-file infra/.env exec postgres psql -U postgres -d engsuite
```

Rebuild only the API image after changing `services/api/Dockerfile` or `services/api/requirements.txt`:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env build api
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d api
```

Stop without deleting data:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env down
```

Reset the local database:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env down -v
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build
```

## Production-Image Smoke Test

Configure local smoke-test secrets:

```bash
cp infra/.env.aws-local.example infra/.env.aws-local
```

Build and start production-style images:

```bash
docker compose -f infra/docker-compose.aws-local.yml --env-file infra/.env.aws-local up -d --build
```

This stack builds and runs one image for each frontend app, plus `pes-api:test` and local Postgres.

Check status and logs:

```bash
docker compose -f infra/docker-compose.aws-local.yml --env-file infra/.env.aws-local ps
docker compose -f infra/docker-compose.aws-local.yml --env-file infra/.env.aws-local logs --tail=120 api
```

Stop the smoke-test stack:

```bash
docker compose -f infra/docker-compose.aws-local.yml --env-file infra/.env.aws-local down
```

## Troubleshooting

### API Exits During Startup

Read the API log first:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env logs --tail=200 api
```

Common causes:

- `ImportError: cannot import name 'UTC' from 'datetime'`: the API image is too old or built with Python 3.10. Rebuild the API image; `services/api/Dockerfile` must use Python 3.11.
- Database connection errors: verify Postgres is healthy and `POSTGRES_PASSWORD` in `infra/.env` matches the compose `DATABASE_URL`.
- Alembic errors: inspect migration heads with `docker compose -f infra/docker-compose.yml --env-file infra/.env exec api alembic heads`.

### Frontend Cannot Reach API

Check the app container environment:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env exec apps env | grep -E 'NEXT_PUBLIC_API_URL|NEXT_PUBLIC_AUTH_API_URL|API_PROXY_TARGET|VITE_API_URL'
```

Development defaults:

- Browser API URL: `http://localhost:8000`
- Container-internal API proxy target: `http://api:8000`

### Port Already In Use

Stop the conflicting process or change the published host port in the relevant compose file. The standard local ports are `3000-3009`, `5432`, and `8000`.

