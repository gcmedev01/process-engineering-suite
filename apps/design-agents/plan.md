# Plan: Rebuild Process Design Agents

## 1. Project Initialization (Frontend)
- [ ] **Scaffold Vite App:** Initialize a new React + TypeScript app using Vite in `apps/design-agents`.
- [ ] **Turborepo Config:** Update `turbo.json` and root `package.json` to include the new app.
- [ ] **Dependencies:** Install necessary packages:
    - `react`, `react-dom`
    - `@mui/material`, `@emotion/react`, `@emotion/styled`
    - `zustand` (for state management)
    - `@tanstack/react-query`
    - `@tanstack/react-table`
    - `react-router-dom` (or standard routing)
    - Workspace packages: `@eng-suite/ui-kit`
- [ ] **Configuration:**
    - Setup `vite.config.ts`.
    - Setup `tsconfig.json` (extending base).
    - Setup Tailwind CSS (if used by UI kit).

## 2. Backend Integration (API)
- [ ] **Restore Router:** Re-create `services/api/app/routers/design_agents.py` with a basic health check and `ProcessDesignGraph` placeholder.
- [ ] **Dependencies:** Re-add `langgraph`, `langchain`, `openai`, etc., to `services/api/requirements.txt` specifically for this module.
- [ ] **Register Router:** Re-register the router in `services/api/main.py`.
- [ ] **CORS:** Re-enable CORS for the new frontend port (likely 3004).

## 3. Core Architecture
- [ ] **State Management:** Create a Zustand store (`useDesignStore`) to hold `DesignProject`, `DesignState`, and `StepSnapshot`.
- [ ] **Types:** Define shared types for the design state (potentially in `packages/api-std` or locally if specific).
- [ ] **Layout:** Create the main application shell with the "Stepper" sidebar and main content area.

## 4. Feature Implementation
- [ ] **Requirements View:** Markdown editor for process requirements.
- [ ] **Engineering Spreadsheet:** Implement the grid for Equipment and Stream lists using TanStack Table.
- [ ] **Agent Integration:** Connect the UI to the backend `ProcessDesignGraph` to trigger agents and view results.
- [ ] **Approval Workflow:** Implement the UI for reviewing and approving agent outputs.

## 5. Polishing
- [ ] **Theming:** Ensure the app matches the suite's Glassmorphism/MUI theme.
- [ ] **Testing:** Add basic unit tests for critical components.
