# Environment Variables Reference

This document lists all environment variables used by the Process Engineering Suite applications.

## Global Variables

These variables apply to the entire suite or multiple applications.

### Deployment Target Contract

- `DEPLOY_TARGET`: deployment lane selector used to keep platform behavior isolated
  - Values: `local`, `vercel`, `aws`
  - Default: `local`
  - Set `DEPLOY_TARGET=vercel` on Vercel projects
  - Set `DEPLOY_TARGET=aws` on AWS deployments

### Database Configuration

- `POSTGRES_PASSWORD`: PostgreSQL database password (required for production)
- `POSTGRES_USER`: PostgreSQL database user (default: postgres)
- `POSTGRES_DB`: PostgreSQL database name (default: engsuite)
- `POSTGRES_PORT`: Host port used by local Postgres compose services (default: 5432)
- `DATABASE_URL`: Full PostgreSQL connection string (optional, auto-built if not provided)
  - Format: `postgresql+asyncpg://user:password@host:port/database`

### API Configuration

- `API_URL`: build-time source for AWS frontend images
  - Used by `infra/aws/scripts/build-and-push.sh` to populate `NEXT_PUBLIC_API_URL`
- `AUTH_API_URL`: optional build-time source for browser auth URLs
  - Defaults to `API_URL` in the AWS build script when unset
- `NEXT_PUBLIC_API_URL`: Backend API base URL (default: http://localhost:8000)
  - Used by all frontend applications
- `NEXT_PUBLIC_AUTH_API_URL`: Browser-facing authentication API base URL
  - Defaults to `NEXT_PUBLIC_API_URL` in shared auth clients when unset
- `API_PROXY_TARGET`: server-side rewrite target for PSV `/api/*` routes
  - Default: `NEXT_PUBLIC_API_URL` if set, otherwise `http://localhost:8000`
- `CORS_ALLOWED_ORIGINS`: comma-separated browser origins accepted by the FastAPI CORS middleware
- `SEED_FROM_MOCK`: when `true`, API startup seed script loads `services/api/mock_data.json` if the database is empty

### Cross-App Routing (Web Dashboard)

- `DOCS_URL`: docs app origin used by web rewrites
- `NETWORK_EDITOR_URL`: network-editor app origin used by web rewrites
- `PSV_URL`: PSV app origin used by web rewrites
- `DESIGN_AGENTS_URL`: design-agents app origin used by web rewrites
- `VENTING_URL`: venting-calculation app origin used by web rewrites
- `VESSELS_CALCULATION_URL`: vessels-calculation app origin used by web rewrites
  - Legacy aliases: `VESSEL_CALCULATION_URL`, `VESSEL_URL`
- `PUMP_URL`: pump-calculation app origin used by web rewrites
- `HEAT_TRANSFER_URL`: heat-transfer-calculation app origin used by web rewrites
- `CONTROL_VALVE_URL`: control-valve-calculation app origin used by web rewrites

## Application-Specific Variables

### PSV Application (apps/psv)

- `NEXT_PUBLIC_USE_LOCAL_STORAGE`: Enable demo mode with localStorage authentication
  - Values: `true` (demo mode) or `false` (API mode)
  - Default: `false`
  - In demo mode, no backend required

### API Backend (services/api)

- `USE_MOCK_DATA`: Force mock data usage even when database is available
  - Values: `true` or `false`
  - Default: `false`
- `SECRET_KEY`: Secret key for JWT tokens and security
  - Required for production authentication
- `DATABASE_URL`: PostgreSQL URL used by SQLAlchemy and Alembic
- `CORS_ALLOWED_ORIGINS`: FastAPI CORS allow-list; prefer this name over legacy `ALLOWED_ORIGINS`

### Venting Calculation (apps/venting-calculation)

- `NEXT_PUBLIC_API_URL`: Backend API base URL (default: `http://localhost:8000`)
  - Required to connect the Save/Load feature to the central PostgreSQL database
  - App runs on port 3005; CORS for this port is registered in the FastAPI backend

### Network Editor (apps/network-editor)

- `NEXT_PUBLIC_API_URL`: Backend API base URL (default: `http://localhost:8000`)
  - Used for both hydraulic calculations and the new cloud Save/Load feature

### Web/Dashboard (apps/web)

- `DEFAULT_THEME`: Default theme for the application
  - Values: `light` or `dark`
  - Default: `light`

### Design Agents (apps/design-agents)

- `VITE_API_URL`: Backend API base URL for this **Vite** application (default: `http://localhost:8000`)
  - Note: Uses Vite's `import.meta.env.VITE_API_URL` convention, **not** `NEXT_PUBLIC_API_URL`
  - Used for both the LLM agent pipeline and the new cloud session Save/Load feature

### Docs Application (apps/docs)

Coming Soon - No environment variables defined yet.

## Development vs Production

### Development

```bash
# Basic development setup
bun run dev

# With custom API URL
NEXT_PUBLIC_API_URL=http://localhost:8000 bun run dev
```

### Development - Docker

```bash
cp infra/.env.example infra/.env
# edit infra/.env and set POSTGRES_PASSWORD

docker compose -f infra/docker-compose.yml --env-file infra/.env up --build
```

The dev compose sets these automatically for containers:

```env
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_API_URL=http://localhost:8000
API_PROXY_TARGET=http://api:8000
VITE_API_URL=http://localhost:8000
SEED_FROM_MOCK=true
```

### Production-Image Smoke Test - Docker

```bash
cp infra/.env.aws-local.example infra/.env.aws-local
# edit infra/.env.aws-local and set local secrets

docker compose -f infra/docker-compose.aws-local.yml --env-file infra/.env.aws-local up -d --build
```

### Production - Docker / AWS

```bash
# Environment file
cat > .env << EOF
DEPLOY_TARGET=aws
POSTGRES_PASSWORD=secure-password
POSTGRES_USER=postgres
POSTGRES_DB=engsuite
DATABASE_URL=postgresql+asyncpg://postgres:secure-password@postgres:5432/engsuite
API_URL=https://api.your-domain.com
AUTH_API_URL=https://api.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_AUTH_API_URL=https://api.your-domain.com
API_PROXY_TARGET=https://api.your-domain.com
DOCS_URL=https://docs.your-domain.com
NETWORK_EDITOR_URL=https://network-editor.your-domain.com
PSV_URL=https://psv.your-domain.com
DESIGN_AGENTS_URL=https://design-agents.your-domain.com
VENTING_URL=https://venting.your-domain.com
VESSELS_CALCULATION_URL=https://vessels.your-domain.com
PUMP_URL=https://pump.your-domain.com
HEAT_TRANSFER_URL=https://heat-transfer.your-domain.com
CONTROL_VALVE_URL=https://control-valve.your-domain.com
EOF

# Run with Docker Compose
docker compose -f infra/docker-compose.yml --env-file .env up -d
```

### AWS Build Workflow

The AWS image build script requires the dashboard routing URLs at build time:

```bash
API_URL=https://api.your-domain.com \
DOCS_URL=https://docs.your-domain.com \
NETWORK_EDITOR_URL=https://network-editor.your-domain.com \
PSV_URL=https://psv.your-domain.com \
DESIGN_AGENTS_URL=https://design-agents.your-domain.com \
VENTING_URL=https://venting.your-domain.com \
VESSELS_CALCULATION_URL=https://vessels.your-domain.com \
PUMP_URL=https://pump.your-domain.com \
HEAT_TRANSFER_URL=https://heat-transfer.your-domain.com \
CONTROL_VALVE_URL=https://control-valve.your-domain.com \
./infra/aws/scripts/build-and-push.sh
```

Render ECS task definitions from templates before registration:

```bash
./infra/aws/scripts/render-task-definitions.sh us-east-1 123456789012 testsha
```

### Production - Direct Deployment

```bash
# API environment
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
SECRET_KEY=your-secret-key
USE_MOCK_DATA=false

# Frontend environment
NEXT_PUBLIC_API_URL=https://your-api-domain
API_PROXY_TARGET=https://your-api-domain
NEXT_PUBLIC_USE_LOCAL_STORAGE=false
```

### Production - Vercel

Set these in each Vercel project:

```bash
DEPLOY_TARGET=vercel
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_AUTH_API_URL=https://api.your-domain.com
```

For `apps/web`, also set:

```bash
DOCS_URL=https://your-docs-app.vercel.app
NETWORK_EDITOR_URL=https://your-network-editor-app.vercel.app
PSV_URL=https://your-psv-app.vercel.app
DESIGN_AGENTS_URL=https://your-design-agents-app.vercel.app
VENTING_URL=https://your-venting-app.vercel.app
VESSELS_CALCULATION_URL=https://your-vessels-app.vercel.app
PUMP_URL=https://your-pump-app.vercel.app
HEAT_TRANSFER_URL=https://your-heat-transfer-app.vercel.app
CONTROL_VALVE_URL=https://your-control-valve-app.vercel.app
```

## Security Considerations

- Never commit `.env` files to version control
- Use strong passwords for database credentials
- Rotate `SECRET_KEY` regularly in production
- Use HTTPS for `NEXT_PUBLIC_API_URL` in production
- Consider using Docker secrets or external secret management

## Validation

Verify environment configuration:

```bash
# Check API health
curl http://localhost:8000/health

# Check database connection (API logs)
curl http://localhost:8000/admin/data-source

# Test frontend connectivity
curl http://localhost:3003/api/health  # PSV
curl http://localhost:3002/api/health  # Network Editor
```

Validate both deployment lanes before merge:

```bash
bun run check:deploy:matrix
```

## Troubleshooting

### Common Issues

- **API connection errors**: Check `NEXT_PUBLIC_API_URL` format and accessibility
- **Database connection failed**: Verify `DATABASE_URL` syntax and database availability
- **Authentication issues**: Ensure `SECRET_KEY` is set for API
- **Demo mode not working**: Confirm `NEXT_PUBLIC_USE_LOCAL_STORAGE=true`

### Environment Variable Precedence

1. Explicit `DATABASE_URL` overrides individual Postgres variables
2. Application-specific variables override defaults
3. `API_PROXY_TARGET` overrides `NEXT_PUBLIC_API_URL` for PSV server-side rewrites
4. Docker environment overrides system environment

## Related Documentation

- `docs/DOCKER_DEVELOPMENT.md` - Docker development and AWS-local smoke testing
- `docs/DEPLOYMENT.md` - Deployment instructions
- `TROUBLESHOOTING.md` - Issue resolution guides
