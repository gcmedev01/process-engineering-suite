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
    - Docs: [http://localhost:3001](http://localhost:3001)
    - Network Editor: [http://localhost:3002](http://localhost:3002)
    - PSV: [http://localhost:3003](http://localhost:3003)
    - Design Agents: [http://localhost:3004](http://localhost:3004)
    - Venting Calculation: [http://localhost:3005](http://localhost:3005)
    - Vessels Calculation: [http://localhost:3006](http://localhost:3006)
    - Pump Calculation: [http://localhost:3007](http://localhost:3007)
    - Heat Transfer Calculation: [http://localhost:3008](http://localhost:3008)

3.  **Build**:
    ```bash
    bun run build
    ```

## Project Structure

- **`apps/`**: Frontend applications — web (dashboard), docs, network-editor, psv, design-agents, venting-calculation, vessels-calculation, pump-calculation, heat-transfer-calculation, calculation-template
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

## Troubleshooting

- **Hydration Errors**: If you see hydration mismatch errors, check for browser extensions injecting code. We use `suppressHydrationWarning` in `layout.tsx` to mitigate this.
- **Type Errors**: If you encounter type mismatches between packages, ensure you have rebuilt the packages or that the types are correctly exported and imported.
- **Docker Issues**: Use `infra/docker-compose.yml` for running services locally
