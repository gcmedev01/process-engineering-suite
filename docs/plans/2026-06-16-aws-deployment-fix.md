# AWS Deployment Fix Plan — P0 / P1 / P2

## Target state

Deploy the **full Process Engineering Suite** to AWS ECS/Fargate using Docker images, with:

* all apps covered by ECR/ECS/ALB;
* build-time frontend URLs correctly injected;
* strict CI gate;
* immutable image tags;
* separate DB migration task;
* valid health checks;
* repeatable AWS deployment workflow.

The current repo already has Dockerfiles, AWS-local compose, ECS task templates, and deployment docs, but AWS production currently covers only the core services, while the repo contains more frontend apps.  

---

# Loop structure

Use this fix loop for each phase:

```text
1. Create branch
2. Apply one focused fix group
3. Run local validation
4. Run AWS-local Docker smoke test
5. Commit
6. Open PR
7. Check CI
8. Merge only if acceptance criteria pass
```

Recommended branch names:

```text
fix/aws-p0-full-suite-deploy
fix/aws-p1-deploy-hardening
fix/aws-p2-github-actions-deploy
```

---

# P0 — Deployment blockers

## P0.1 — Decide and enforce deployment scope

### Decision

Use **full-suite AWS deployment**, not reduced core deployment.

Full suite means these services must be covered:

```text
api
web
docs
network-editor
psv
design-agents
venting-calculation
vessels-calculation
pump-calculation
heat-transfer-calculation
control-valve-calculation
```

The README lists all these apps and service ports. 

### Files to update

```text
infra/aws/scripts/build-and-push.sh
infra/aws/task-definitions/*.json
docs/DEPLOYMENT.md
docs/ENVIRONMENT_VARIABLES.md
README.md
```

### Required changes

Add AWS production coverage for the missing apps:

```text
docs
venting-calculation
vessels-calculation
pump-calculation
heat-transfer-calculation
control-valve-calculation
```

The existing AWS build script currently only creates/pushes `api`, `web`, `network-editor`, `psv`, and `design-agents`.  

### Acceptance criteria

```bash
grep -E "docs|venting-calculation|vessels-calculation|pump-calculation|heat-transfer-calculation|control-valve-calculation" infra/aws/scripts/build-and-push.sh
```

Expected: all missing apps appear in the ECR repo loop and image build/push section.

---

## P0.2 — Fix build-time environment injection

### Problem

`Dockerfile.frontend` states that `NEXT_PUBLIC_*` values and proxy targets are baked at build time. 

The web dashboard uses app routing variables such as:

```text
DOCS_URL
NETWORK_EDITOR_URL
PSV_URL
DESIGN_AGENTS_URL
VENTING_URL
VESSELS_CALCULATION_URL
PUMP_URL
HEAT_TRANSFER_URL
CONTROL_VALVE_URL
```



### Files to update

```text
infra/aws/scripts/build-and-push.sh
infra/.env.aws.example
infra/.env.aws-local.example
docs/ENVIRONMENT_VARIABLES.md
```

### Required changes

Add required build args to `build-and-push.sh`.

For `web`:

```bash
--build-arg APP_NAME=web \
--build-arg BASE_PATH="" \
--build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
--build-arg NEXT_PUBLIC_AUTH_API_URL="${AUTH_API_URL:-$API_URL}" \
--build-arg API_PROXY_TARGET="${API_PROXY_TARGET:-$API_URL}" \
--build-arg DOCS_URL="${DOCS_URL}" \
--build-arg NETWORK_EDITOR_URL="${NETWORK_EDITOR_URL}" \
--build-arg PSV_URL="${PSV_URL}" \
--build-arg DESIGN_AGENTS_URL="${DESIGN_AGENTS_URL}" \
--build-arg VENTING_URL="${VENTING_URL}" \
--build-arg VESSELS_CALCULATION_URL="${VESSELS_CALCULATION_URL}" \
--build-arg PUMP_URL="${PUMP_URL}" \
--build-arg HEAT_TRANSFER_URL="${HEAT_TRANSFER_URL}" \
--build-arg CONTROL_VALVE_URL="${CONTROL_VALVE_URL}"
```

For every Next.js sub-app:

```bash
--build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
--build-arg NEXT_PUBLIC_AUTH_API_URL="${AUTH_API_URL:-$API_URL}" \
--build-arg API_PROXY_TARGET="${API_PROXY_TARGET:-$API_URL}"
```

For `design-agents`, pass `VITE_API_URL`; its Dockerfile expects that build arg. 

```bash
docker build \
  --build-arg VITE_API_URL="${API_URL}" \
  -f infra/docker/Dockerfile.vite \
  -t "${ECR_BASE}/process-engineering/design-agents:${IMAGE_TAG}" \
  .
```

### Add fail-fast validation

At the top of `build-and-push.sh`, add:

```bash
required_vars=(
  API_URL
  DOCS_URL
  NETWORK_EDITOR_URL
  PSV_URL
  DESIGN_AGENTS_URL
  VENTING_URL
  VESSELS_CALCULATION_URL
  PUMP_URL
  HEAT_TRANSFER_URL
  CONTROL_VALVE_URL
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is required for AWS frontend build"
    exit 1
  fi
done
```

### Acceptance criteria

```bash
API_URL=https://api.example.com \
DOCS_URL=https://app.example.com/docs \
NETWORK_EDITOR_URL=https://app.example.com/network-editor \
PSV_URL=https://app.example.com/psv \
DESIGN_AGENTS_URL=https://app.example.com/design-agents \
VENTING_URL=https://app.example.com/venting-calculation \
VESSELS_CALCULATION_URL=https://app.example.com/vessels-calculation \
PUMP_URL=https://app.example.com/pump-calculation \
HEAT_TRANSFER_URL=https://app.example.com/heat-transfer-calculation \
CONTROL_VALVE_URL=https://app.example.com/control-valve-calculation \
./infra/aws/scripts/build-and-push.sh us-east-1 YOUR_ACCOUNT_ID
```

Expected: script validates required vars before building.

---

## P0.3 — Add task definitions for all missing frontend apps

### Files to create

```text
infra/aws/task-definitions/docs.json
infra/aws/task-definitions/venting-calculation.json
infra/aws/task-definitions/vessels-calculation.json
infra/aws/task-definitions/pump-calculation.json
infra/aws/task-definitions/heat-transfer-calculation.json
infra/aws/task-definitions/control-valve-calculation.json
```

Use the existing `network-editor.json` / `psv.json` structure as template. Existing frontend task definitions use Fargate, awsvpc, port 3000, CloudWatch logs, and route-based health checks.  

### Required task definition pattern

Example for `pump-calculation`:

```json
{
  "family": "process-engineering-pump-calculation",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "pump-calculation",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/process-engineering/pump-calculation:IMAGE_TAG",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DEPLOYMENT_ENV",
          "value": "aws"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/process-engineering-pump-calculation",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:3000/pump-calculation', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))\""
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ]
}
```

### Acceptance criteria

```bash
for service in docs venting-calculation vessels-calculation pump-calculation heat-transfer-calculation control-valve-calculation; do
  test -f "infra/aws/task-definitions/${service}.json" || exit 1
done
```

---

## P0.4 — Fix strict CI gate

### Problem

The current CI allows Python/API type-check and test failures because of `|| true`.  

### File to update

```text
.github/workflows/ci.yml
```

### Required changes

Remove `|| true`.

Change:

```yaml
- run: mypy pes_calc/ hydraulics/ --ignore-missing-imports || true
- run: pytest hydraulics/tests/ -v || true
```

To:

```yaml
- run: mypy pes_calc/ hydraulics/ --ignore-missing-imports
- run: pytest hydraulics/tests/ -v
```

Change:

```yaml
- run: mypy app/ --ignore-missing-imports || true
- run: pytest tests/ -v || true
```

To:

```yaml
- run: mypy app/ --ignore-missing-imports
- run: pytest tests/ -v
```

### Acceptance criteria

```bash
grep -R "|| true" .github/workflows/ci.yml && exit 1 || echo "CI is strict"
```

Expected:

```text
CI is strict
```

---

## P0.5 — Make task definitions renderable, not manually edited

### Problem

Current ECS task definitions contain placeholders such as `ACCOUNT_ID` and `REGION`. 

### Files to create

```text
infra/aws/scripts/render-task-definitions.sh
infra/aws/task-definitions/templates/*.json
infra/aws/task-definitions/rendered/.gitkeep
```

### Required behavior

Move existing task definitions into:

```text
infra/aws/task-definitions/templates/
```

Use placeholders:

```text
ACCOUNT_ID
REGION
IMAGE_TAG
```

Generate rendered files:

```bash
./infra/aws/scripts/render-task-definitions.sh us-east-1 YOUR_ACCOUNT_ID GIT_SHA
```

Output:

```text
infra/aws/task-definitions/rendered/api.json
infra/aws/task-definitions/rendered/web.json
...
```

### Script skeleton

```bash
#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${1:?region required}"
AWS_ACCOUNT_ID="${2:?account id required}"
IMAGE_TAG="${3:?image tag required}"

SRC_DIR="infra/aws/task-definitions/templates"
OUT_DIR="infra/aws/task-definitions/rendered"

mkdir -p "$OUT_DIR"

for file in "$SRC_DIR"/*.json; do
  name="$(basename "$file")"
  sed \
    -e "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" \
    -e "s/REGION/${AWS_REGION}/g" \
    -e "s/IMAGE_TAG/${IMAGE_TAG}/g" \
    "$file" > "$OUT_DIR/$name"
done
```

### Acceptance criteria

```bash
./infra/aws/scripts/render-task-definitions.sh us-east-1 123456789012 testsha

grep -R "ACCOUNT_ID\|REGION\|IMAGE_TAG" infra/aws/task-definitions/rendered && exit 1 || echo "render ok"
```

Expected:

```text
render ok
```

---

# P1 — Deployment hardening

## P1.1 — Use immutable image tags

### File to update

```text
infra/aws/scripts/build-and-push.sh
```

### Required changes

Add:

```bash
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
```

Tag every image twice:

```bash
-t "${ECR_BASE}/process-engineering/api:${IMAGE_TAG}" \
-t "${ECR_BASE}/process-engineering/api:latest"
```

Push both:

```bash
docker push "${ECR_BASE}/process-engineering/api:${IMAGE_TAG}"
docker push "${ECR_BASE}/process-engineering/api:latest"
```

### Acceptance criteria

```bash
IMAGE_TAG=testsha ./infra/aws/scripts/build-and-push.sh us-east-1 YOUR_ACCOUNT_ID
```

Expected: ECR receives both `testsha` and `latest`.

---

## P1.2 — Move DB migration out of API startup

### Problem

The API container currently runs Alembic during startup. 

This is risky once API desired count is more than one.

### Files to update/create

```text
infra/docker/Dockerfile.api
infra/aws/task-definitions/templates/api-migration.json
infra/aws/scripts/run-migration.sh
docs/DEPLOYMENT.md
```

### Required changes

Change API Dockerfile CMD to only start the app:

```dockerfile
CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create one-off migration task definition using the same image:

```json
{
  "family": "process-engineering-api-migration",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api-migration",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/process-engineering/api:IMAGE_TAG",
      "essential": true,
      "command": [
        "sh",
        "-c",
        "cd /app/services/api && alembic upgrade head"
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:process-engineering/database-url"
        },
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:process-engineering/secret-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/process-engineering-api-migration",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Acceptance criteria

```bash
grep -R "alembic upgrade head" infra/docker/Dockerfile.api && exit 1 || echo "api startup clean"
grep -R "alembic upgrade head" infra/aws/task-definitions/templates/api-migration.json
```

Expected:

```text
api startup clean
```

and migration command exists only in migration task.

---

## P1.3 — Align ALB health checks with app routes

### Problem

Deployment docs create ALB target groups using `/health` for most services. 

Frontend ECS container checks currently use app base paths such as `/network-editor` and `/psv`.  

### Fix approach

Use base-path health checks for frontend ALB target groups:

| Service                   | ALB health path              |
| ------------------------- | ---------------------------- |
| api                       | `/health`                    |
| web                       | `/`                          |
| docs                      | `/docs`                      |
| network-editor            | `/network-editor`            |
| psv                       | `/psv`                       |
| design-agents             | `/design-agents/`            |
| venting-calculation       | `/venting-calculation`       |
| vessels-calculation       | `/vessels-calculation`       |
| pump-calculation          | `/pump-calculation`          |
| heat-transfer-calculation | `/heat-transfer-calculation` |
| control-valve-calculation | `/control-valve-calculation` |

### Files to update

```text
docs/DEPLOYMENT.md
infra/aws/scripts/create-target-groups.sh
```

Create `create-target-groups.sh` instead of embedding fragile shell logic in docs.

### Acceptance criteria

```bash
grep -R "/pump-calculation\|/vessels-calculation\|/control-valve-calculation" infra/aws/scripts/create-target-groups.sh
```

---

## P1.4 — Add `.dockerignore`

### File to create

```text
.dockerignore
```

### Content

```dockerignore
.git
.github
node_modules
**/node_modules
.turbo
.vercel
.next
**/.next
dist
**/dist
coverage
.pytest_cache
.mypy_cache
.ruff_cache
__pycache__
**/__pycache__
*.pyc
.venv
venv
.env
.env.*
infra/.env
infra/.env.local
infra/.env.aws
infra/.env.aws-local
.DS_Store
```

### Acceptance criteria

```bash
test -f .dockerignore
```

---

# P2 — Automation and repeatability

## P2.1 — Add GitHub Actions AWS deployment workflow

### File to create

```text
.github/workflows/aws-deploy.yml
```

### Required GitHub secrets

```text
AWS_ROLE_TO_ASSUME
AWS_REGION
AWS_ACCOUNT_ID
ECS_CLUSTER
ECS_PRIVATE_SUBNETS
ECS_SECURITY_GROUPS
API_URL
DOCS_URL
NETWORK_EDITOR_URL
PSV_URL
DESIGN_AGENTS_URL
VENTING_URL
VESSELS_CALCULATION_URL
PUMP_URL
HEAT_TRANSFER_URL
CONTROL_VALVE_URL
```

### Workflow structure

```yaml
name: AWS Deploy

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Image tag. Defaults to commit SHA."
        required: false
  push:
    branches: [main]
    paths:
      - "apps/**"
      - "packages/**"
      - "services/**"
      - "infra/**"
      - ".github/workflows/aws-deploy.yml"

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    name: Build, Push, Migrate, Deploy
    runs-on: ubuntu-latest

    env:
      AWS_REGION: ${{ secrets.AWS_REGION }}
      AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}
      IMAGE_TAG: ${{ github.event.inputs.image_tag || github.sha }}
      API_URL: ${{ secrets.API_URL }}
      DOCS_URL: ${{ secrets.DOCS_URL }}
      NETWORK_EDITOR_URL: ${{ secrets.NETWORK_EDITOR_URL }}
      PSV_URL: ${{ secrets.PSV_URL }}
      DESIGN_AGENTS_URL: ${{ secrets.DESIGN_AGENTS_URL }}
      VENTING_URL: ${{ secrets.VENTING_URL }}
      VESSELS_CALCULATION_URL: ${{ secrets.VESSELS_CALCULATION_URL }}
      PUMP_URL: ${{ secrets.PUMP_URL }}
      HEAT_TRANSFER_URL: ${{ secrets.HEAT_TRANSFER_URL }}
      CONTROL_VALVE_URL: ${{ secrets.CONTROL_VALVE_URL }}

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install and test TypeScript
        run: |
          bun install --frozen-lockfile
          bun run lint
          bun run check-types
          bun run build

      - name: Test API
        working-directory: services/api
        run: |
          pip install -r requirements.txt
          pip install ruff mypy pytest
          ruff check .
          ruff format --check .
          mypy app/ --ignore-missing-imports
          pytest tests/ -v

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Build and push images
        run: |
          chmod +x infra/aws/scripts/build-and-push.sh
          IMAGE_TAG="${IMAGE_TAG}" ./infra/aws/scripts/build-and-push.sh "${AWS_REGION}" "${AWS_ACCOUNT_ID}"

      - name: Render task definitions
        run: |
          chmod +x infra/aws/scripts/render-task-definitions.sh
          ./infra/aws/scripts/render-task-definitions.sh "${AWS_REGION}" "${AWS_ACCOUNT_ID}" "${IMAGE_TAG}"

      - name: Register task definitions
        run: |
          for file in infra/aws/task-definitions/rendered/*.json; do
            aws ecs register-task-definition --cli-input-json "file://${file}"
          done

      - name: Run migration task
        run: |
          chmod +x infra/aws/scripts/run-migration.sh
          ./infra/aws/scripts/run-migration.sh "${AWS_REGION}" "${IMAGE_TAG}"

      - name: Update ECS services
        run: |
          chmod +x infra/aws/scripts/update-services.sh
          ./infra/aws/scripts/update-services.sh "${AWS_REGION}" "${IMAGE_TAG}"
```

### Acceptance criteria

```bash
test -f .github/workflows/aws-deploy.yml
```

---

## P2.2 — Add service update script

### File to create

```text
infra/aws/scripts/update-services.sh
```

### Service list

```bash
SERVICES=(
  api
  web
  docs
  network-editor
  psv
  design-agents
  venting-calculation
  vessels-calculation
  pump-calculation
  heat-transfer-calculation
  control-valve-calculation
)
```

### Script behavior

For each service:

```bash
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$service" \
  --task-definition "process-engineering-${service}" \
  --force-new-deployment \
  --region "$AWS_REGION"

aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$service" \
  --region "$AWS_REGION"
```

### Acceptance criteria

```bash
grep -R "services-stable" infra/aws/scripts/update-services.sh
```

---

## P2.3 — Add deployment verification script

### File to create

```text
infra/aws/scripts/verify-deployment.sh
```

### Required checks

```bash
curl -fsS "$APP_URL/" || exit 1
curl -fsS "$API_URL/health" || exit 1
curl -fsS "$APP_URL/docs" || exit 1
curl -fsS "$APP_URL/network-editor" || exit 1
curl -fsS "$APP_URL/psv" || exit 1
curl -fsS "$APP_URL/design-agents/" || exit 1
curl -fsS "$APP_URL/venting-calculation" || exit 1
curl -fsS "$APP_URL/vessels-calculation" || exit 1
curl -fsS "$APP_URL/pump-calculation" || exit 1
curl -fsS "$APP_URL/heat-transfer-calculation" || exit 1
curl -fsS "$APP_URL/control-valve-calculation" || exit 1
```

### Acceptance criteria

```bash
APP_URL=https://your-domain.com API_URL=https://api.your-domain.com ./infra/aws/scripts/verify-deployment.sh
```

Expected: all routes return HTTP 2xx/3xx.

---

# Recommended execution order

## PR 1 — P0 full-suite AWS deploy coverage

Scope:

```text
P0.1
P0.2
P0.3
P0.5
```

Validation:

```bash
bun install --frozen-lockfile
bun run build

cp infra/.env.aws-local.example infra/.env.aws-local
docker compose -f infra/docker-compose.aws-local.yml --env-file infra/.env.aws-local up -d --build

curl http://localhost:8000/health
curl http://localhost:3000
curl http://localhost:3001/docs
curl http://localhost:3002/network-editor
curl http://localhost:3003/psv
curl http://localhost:3004/design-agents/
curl http://localhost:3005/venting-calculation
curl http://localhost:3006/vessels-calculation
curl http://localhost:3007/pump-calculation
curl http://localhost:3008/heat-transfer-calculation
curl http://localhost:3009/control-valve-calculation
```

---

## PR 2 — P0 strict CI

Scope:

```text
P0.4
```

Validation:

```bash
grep -R "|| true" .github/workflows/ci.yml && exit 1 || echo "strict"
```

---

## PR 3 — P1 hardening

Scope:

```text
P1.1
P1.2
P1.3
P1.4
```

Validation:

```bash
test -f .dockerignore

grep -R "alembic upgrade head" infra/docker/Dockerfile.api && exit 1 || echo "migration removed from API startup"

./infra/aws/scripts/render-task-definitions.sh us-east-1 123456789012 testsha

grep -R "ACCOUNT_ID\|REGION\|IMAGE_TAG" infra/aws/task-definitions/rendered && exit 1 || echo "render clean"
```

---

## PR 4 — P2 automation

Scope:

```text
P2.1
P2.2
P2.3
```

Validation:

```bash
test -f .github/workflows/aws-deploy.yml
test -f infra/aws/scripts/update-services.sh
test -f infra/aws/scripts/verify-deployment.sh
```

---

# Loop prompt for fixing agent

Use this prompt for each loop:

```text
You are fixing AWS Docker deployment readiness for repository may3rd/process-engineering-suite.

Work only on the current phase described below. Do not mix unrelated changes.

Current phase:
[PASTE ONE PHASE: P0.1 / P0.2 / etc.]

Rules:
1. Preserve current monorepo structure.
2. Support full-suite AWS deployment, not core-only deployment.
3. All frontend API and routing URLs must be build-time args.
4. ECS task definitions must be template-rendered with ACCOUNT_ID, REGION, and IMAGE_TAG.
5. CI must fail on test/type-check failures.
6. Use immutable image tags.
7. DB migration must run as one-off ECS task, not inside normal API startup.
8. Add or update documentation only when behavior changes.
9. Provide exact validation commands at the end.
10. Do not deploy. Only modify repo files.

Acceptance criteria:
[PASTE ACCEPTANCE CRITERIA FOR THE PHASE]
```

---

# Final deployment gate

Do not deploy to AWS until all checks pass:

```bash
bun install --frozen-lockfile
bun run lint
bun run check-types
bun run build

cd services/api
pip install -r requirements.txt
pip install ruff mypy pytest
ruff check .
ruff format --check .
mypy app/ --ignore-missing-imports
pytest tests/ -v
cd ../..

cp infra/.env.aws-local.example infra/.env.aws-local
docker compose -f infra/docker-compose.aws-local.yml --env-file infra/.env.aws-local up -d --build

curl http://localhost:8000/health
curl http://localhost:3000
curl http://localhost:3001/docs
curl http://localhost:3002/network-editor
curl http://localhost:3003/psv
curl http://localhost:3004/design-agents/
curl http://localhost:3005/venting-calculation
curl http://localhost:3006/vessels-calculation
curl http://localhost:3007/pump-calculation
curl http://localhost:3008/heat-transfer-calculation
curl http://localhost:3009/control-valve-calculation
```

Deployment is acceptable only when this entire gate passes.
