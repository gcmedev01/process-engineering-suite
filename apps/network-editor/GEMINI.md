# Network Editor Project Context

## Overview
This is a Network Editor application built with Next.js, React Flow, and Material UI. It allows users to design and simulate fluid network diagrams (nodes and pipes).

## Tech Stack
- **Framework**: Next.js (App Router)
- **UI Library**: Material UI (MUI)
- **Diagramming**: React Flow (@xyflow/react)
- **State Management**: Zustand
- **Language**: TypeScript

## Looks and Feels
The application has a modern, clean look with a dark theme and a light theme. The dark theme is the default, and the light theme can be enabled by clicking the sun icon in the top right corner. The dialog and panel components are styled using Material UI with glassmorphism and iOS like design and are responsive.

## Current State (as of Dec 2, 2025)
The application has recently undergone a major refactor to move state management from local state/prop drilling to a global Zustand store.

### Recent Changes
- **Zustand Integration**: `NetworkEditor.tsx`, `PropertiesPanel.tsx`, and `SummaryTable.tsx` now consume state directly from `useNetworkStore`.
- **Prop Removal**: `page.tsx` has been cleaned up and no longer passes massive amounts of props to child components.
- **Refactoring**: `NetworkEditor` was split into a wrapper and an inner `EditorCanvas` component.
- **Linting**: Fixed various lint errors and circular dependency issues in the refactored components.

## Key Files
- **Store**: `src/store/useNetworkStore.ts` - Centralized state management for the network, selection, and UI state.
- **Main Page**: `src/app/page.tsx` - The main entry point, now simplified.
- **Editor**: `src/components/NetworkEditor.tsx` - The canvas component (React Flow wrapper).
- **Properties**: `src/components/PropertiesPanel.tsx` - The side panel for editing node/pipe properties.
- **Summary**: `src/components/SummaryTable.tsx` - The data grid view of the network.

## Setup Instructions
1.  **Install Dependencies**:
    ```bash
    bun install
    ```
2.  **Run Development Server**:
    ```bash
    bun run dev
    ```
3.  **Build**:
    ```bash
    bun run build
    ```

## Next Steps / Pending Tasks
- **Testing**: Verify all interactions (drag, drop, connect, property updates) work as expected after the refactor.
- **Feature Work**: Continue with any pending feature requests (e.g., advanced fluid calculations, export options).
- **Database**: Add a database to store the network data. See `docs/DATABASE_SCHEMA.md` for the proposed design.
- **Performance**: Optimize the application for better performance, especially when handling large networks.
- **Documentation**: Update the documentation to reflect the recent changes.

## Notes for Continuity
- If you open this project on a new machine, ensure you have the latest `node_modules`.
- The `GEMINI.md` file (this file) serves as a high-level context for the AI assistant to quickly understand the project state.

## Input Component Patterns (as of Dec 8, 2025)

### Available Input Components (from `@eng-suite/ui-kit`)
| Component | Use Case | Deferred Commit | Units Support |
|-----------|----------|-----------------|---------------|
| `IOSQuantityPage` | Numbers with or without units | ✅ Yes | Optional |
| `IOSTextInputPage` | Text input | ✅ Yes | No |
| `IOSPickerPage` | Selection from list | Commits on select | No |
| `IOSNumberInputPage` | **DEPRECATED** - Use IOSQuantityPage | ✅ Yes | No |

### Deferred Commit Behavior
All numeric and text inputs use a **deferred commit pattern**:
- **Enter** → Commits value, navigates back
- **Escape** → Reverts to original value, navigates back (no commit)
- **Back click** → Commits value on unmount, navigates back

### Required Props
All deferred-commit input components MUST have:
```tsx
onBack={() => navigator.pop()}  // or nav.pop() in render functions
```

### Input Counts (audited Dec 8, 2025)

**NodeSubPages.tsx:**
- 7× `IOSQuantityPage` (Pressure, Temperature, Density, Viscosity, MW, Z Factor, Heat Ratio)
- 1× `IOSTextInputPage` (Fluid Name)
- 2× `IOSPickerPage` (Fluid Phase, Node Selection)

**PipeSubPages.tsx:**
- 19× `IOSQuantityPage` (Mass Flow, Diameter, Length, Roughness, Elevation, Pressure Drop, CV/Cg, Beta Ratio, User K, Fitting Safety Factor, etc.)
- 3× `IOSTextInputPage` (Name, Description, Fluid Name)
- 10× `IOSPickerPage` (Phase, Schedule, Input Mode, Direction, etc.)
