# Developer Guidelines

## Getting Started

1.  **Install Dependencies**:
    ```bash
    bun install
    ```

2.  **Run Development Server**:
    ```bash
    bun run dev
    ```
    - Dashboard: [http://localhost:3000](http://localhost:3000)
    - Docs: [http://localhost:3001/docs](http://localhost:3001/docs)
    - Network Editor: [http://localhost:3002/network-editor](http://localhost:3002/network-editor)
    - PSV: [http://localhost:3003/psv](http://localhost:3003/psv)
    - Design Agents: [http://localhost:3004/design-agents/](http://localhost:3004/design-agents/)
    - Venting Calculation: [http://localhost:3005/venting-calculation](http://localhost:3005/venting-calculation)
    - Vessels Calculation: [http://localhost:3006/vessels-calculation](http://localhost:3006/vessels-calculation)
    - Pump Calculation: [http://localhost:3007/pump-calculation](http://localhost:3007/pump-calculation)
    - Heat Transfer Calculation: [http://localhost:3008/heat-transfer-calculation](http://localhost:3008/heat-transfer-calculation)
    - Control Valve Calculation: [http://localhost:3009/control-valve-calculation](http://localhost:3009/control-valve-calculation)

3.  **Build**:
    ```bash
    bun run build
    ```

## Project Structure

- **`apps/`**: Frontend applications — web (dashboard), docs, network-editor, psv, design-agents, venting-calculation, vessels-calculation, pump-calculation, heat-transfer-calculation, control-valve-calculation, calculation-template
- **`services/`**: Backend services — api (FastAPI), calc-engine (Python)
- **`packages/`**: Shared packages — api-client, api-std, engineering-units, eslint-config, physics-engine, types, typescript-config, ui, ui-kit, and unit-converter (a standalone Python package, currently unused)
- **`infra/`**: Docker and deployment config

## Coding Standards

### TypeScript
- Strict mode is enabled. Avoid `any` whenever possible.
- Define interfaces/types for all props and state.
- Shared types should reside in `packages/physics-engine/src/types.ts` or `packages/types` (`@eng-suite/types`).

### Styling
- Use **Material UI (MUI)** components.
- Use the `sx` prop for styling.
- **Glassmorphism**: Use the shared `glassPanelSx` and `liquidGlassBorderSx` from `@eng-suite/ui-kit` for consistent panel styling.
- **Theming**: Ensure all colors are theme-aware. Use `theme.palette.mode` to switch between light and dark styles.
    - Dark Mode: `rgba(255, 255, 255, 0.1)` backgrounds.
    - Light Mode: `rgba(0, 0, 0, 0.05)` backgrounds.

### State Management
- Use **Zustand** for global application state (e.g., `useNetworkStore` in Network Editor).
- Use React Context for app-wide settings like Theme (`ColorModeContext`).

### Input Components (Properties Panel)

The Network Editor uses iOS-style input pages for deferred commit (values only update the store on Enter or navigation back):

| Component | Use Case | Deferred Commit |
|-----------|----------|-----------------|
| `IOSQuantityPage` | Numbers with or without units | ✅ Yes |
| `IOSTextInputPage` | Text input | ✅ Yes |
| `IOSPickerPage` | Selection from list | Commits on select |

**Behavior:**
- **Enter** → Commits value, navigates back
- **Escape** → Reverts to original value, navigates back (no commit)

**Required Props:** All deferred-commit inputs MUST have:
```tsx
onBack={() => navigator.pop()}  // or nav.pop() in render functions
```

**DO NOT** use `IOSNumberInputPage` for new code - use `IOSQuantityPage` with empty `units` instead.

### Hydraulic Logic

**Pipe Direction & Propagation:**
- **Forward**: Fluid flows from Start Node → End Node. The pressure of the End Node is calculated based on the Start Node.
- **Backward**: Fluid flows from Start Node -> End Node. But the pressure at the Start node is calculated based on the End Node.
- The physics engine uses the defined direction to calculate pressure drops (including elevation signs).
- **Propagation**:
    - **Forward**: Target uses pipe `OutletState`.
    - **Backward**: Target uses pipe `InletState`.
    - Direction is handled natively without creating proxy pipes.

## Contribution Workflow

1.  Create a new branch for your feature or fix.
2.  Implement your changes, following the coding standards.
3.  Run `bun run build` to ensure no TypeScript or build errors.
4.  Submit a Pull Request.

## AWS / Docker Production Images

Five images ship to AWS ECS/Fargate:

| Image | Dockerfile | ECS task definition |
|-------|-----------|-------------------|
| `process-engineering/api` | `infra/docker/Dockerfile.api` | `infra/aws/task-definitions/api.json` |
| `process-engineering/web` | `infra/docker/Dockerfile.frontend` (`APP_NAME=web`) | `infra/aws/task-definitions/web.json` |
| `process-engineering/psv` | `infra/docker/Dockerfile.frontend` (`APP_NAME=psv`) | `infra/aws/task-definitions/psv.json` |
| `process-engineering/network-editor` | `infra/docker/Dockerfile.frontend` (`APP_NAME=network-editor`) | `infra/aws/task-definitions/network-editor.json` |
| `process-engineering/design-agents` | `infra/docker/Dockerfile.vite` | `infra/aws/task-definitions/design-agents.json` |

### Building images locally

```bash
# API
docker build -f infra/docker/Dockerfile.api -t pes-api:test .

# Next.js frontends — pass APP_NAME and optionally BASE_PATH and API_URL
docker build --build-arg APP_NAME=psv --build-arg BASE_PATH=/psv \
  -f infra/docker/Dockerfile.frontend -t pes-psv:test .

# Vite/Nginx (design-agents)
docker build -f infra/docker/Dockerfile.vite -t pes-design-agents:test .
```

**Important:** `NEXT_PUBLIC_API_URL` is baked into the Next.js bundle at build time.
Pass the real API URL as `API_URL=https://api.your-domain.com` when calling
`build-and-push.sh`, or as `--build-arg` when building individually.

### Smoke-testing images locally

```bash
cp infra/.env.aws-local.example infra/.env.aws-local  # set POSTGRES_PASSWORD
docker compose -f infra/docker-compose.aws-local.yml \
  --env-file infra/.env.aws-local up -d
# web → http://localhost:3000
# docs → http://localhost:3001/docs
# api → http://localhost:8000/docs
# psv → http://localhost:3003/psv
# network-editor → http://localhost:3002/network-editor
# design-agents → http://localhost:3004/design-agents/
# venting-calculation → http://localhost:3005/venting-calculation
# vessels-calculation → http://localhost:3006/vessels-calculation
# pump-calculation → http://localhost:3007/pump-calculation
# heat-transfer-calculation → http://localhost:3008/heat-transfer-calculation
# control-valve-calculation → http://localhost:3009/control-valve-calculation
```

### Building and pushing to ECR

```bash
API_URL=https://api.your-domain.com \
  ./infra/aws/scripts/build-and-push.sh [REGION] [ACCOUNT_ID]
```

After pushing, substitute `ACCOUNT_ID` and `REGION` placeholders in each
`infra/aws/task-definitions/*.json` before registering with ECS.

### Monorepo build notes

- **Bun lockfile** is `bun.lock` (text format, not the old binary `bun.lockb`).
- **Next.js `output: "standalone"`** must be set in each deployed app's `next.config.ts`.
- **`turbopack.root`** must point to the repo root in each deployed Next.js app — Next.js 16 + Turbopack won't find hoisted `node_modules` without it.
- **Vite apps** (`design-agents`) must pre-build `./packages/*` before `vite build` because Vite/Rollup resolves package entry points from `dist/`, not raw TypeScript.
- **Alembic migrations** run automatically at API container start; `script_location = alembic` in `alembic.ini` is CWD-relative, so the CMD changes into `services/api/` first.

## Troubleshooting

- **Hydration Errors**: If you see hydration mismatch errors, check for browser extensions injecting code. We use `suppressHydrationWarning` in `layout.tsx` to mitigate this.
- **Type Errors**: If you encounter type mismatches between packages, ensure you have rebuilt the packages or that the types are correctly exported and imported.
- **Docker Issues**: Use `infra/docker-compose.yml` for dev hot-reload; use `infra/docker-compose.aws-local.yml` to test production images.
