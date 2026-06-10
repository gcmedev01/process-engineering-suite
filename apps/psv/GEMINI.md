# PSV Application - AI Context

## Overview
PSV (Pressure Safety Valve) sizing application within the Process Engineering Suite monorepo. Built with Next.js 16, Material UI 7, and Zustand.

## Project Structure

### Apps
- **`apps/psv`**: This PSV sizing application (port 3003)
- **`apps/web`**: Main dashboard (port 3000)
- **`apps/network-editor`**: Hydraulic network tool (port 3002)

### Key Files
- `src/app/page.tsx` - Main page with conditional rendering
- `src/app/layout.tsx` - Root layout with fixed TopToolbar
- `src/app/providers.tsx` - Theme provider with URL param sync
- `src/store/usePsvStore.ts` - Zustand store for navigation state
- `src/store/useAuthStore.ts` - Authentication and user state
- `src/data/mockData.ts` - Mock data with query helpers
- `src/data/types.ts` - TypeScript domain types
- `src/lib/localStorageService.ts` - Local storage persistence for demo mode
- `src/lib/hydraulicValidation.ts` - Hydraulic calculations using physics-engine

### Core Components
- `TopToolbar.tsx` - Header using `TopFloatingToolbar` from ui-kit
- `Breadcrumbs.tsx` - Navigation path with clickable segments
- `HierarchyBrowser.tsx` - List browser for Customer/Plant/Unit/Area/Project
- `ProtectiveSystemList.tsx` - PSV/RD cards with status chips
- `ProtectiveSystemDetail.tsx` - Tabbed detail view (Overview/Scenarios/Sizing/Notes/Attachments/Summary)
- `SizingWorkspace.tsx` - Full-screen PSV sizing calculator
- `SummaryTab.tsx` - Printable summary with hydraulic network details
- `HydraulicReportTable.tsx` - Segment-by-segment hydraulic results table
- `HydraulicReportDialog.tsx` - Detailed hydraulic report export

## Other Document MD fils
- `docs/` - Documentation files for the project

## Unit Conventions (CRITICAL)
- Use `convertUnit()` from `@eng-suite/physics` for conversions

### Storage (SI Units)
All values are stored in SI units for consistency:
- **Pressure**: Pascal (Pa) absolute
- **Temperature**: Kelvin (K)
- **Mass Flow**: kg/s or kg/h (specify unit field)
- **Length**: meters (m)
- **Diameter**: millimeters (mm)
- **Density**: kg/m³
- **Viscosity**: Pa·s

### Display Units
Converted to user-friendly units for display:
- **Pressure**: barg (gauge pressure in bar)
- **Temperature**: °C
- **Mass Flow**: kg/h
- Use `convertUnit()` from `@eng-suite/physics` for conversions
- User's preferences for display units

### Key Conversion Points
1. **`applyHydraulicSegmentsToNetwork()`** in `SizingWorkspace.tsx`:
   - Converts `barg` → `Pa` when storing to `resultSummary.inletState.pressure`
   - Converts `°C` → `K` when storing temperature
2. **`getPipelineSegments()`** in `SummaryTab.tsx`:
   - Converts `Pa` → `barg` for display
3. **`HydraulicReportTable.tsx`**:
   - Uses `segment.inletPressureBarg` directly (already in barg from calculation)

## Design System
- **Glassmorphism**: `backdropFilter: blur`, translucent backgrounds
- **Theme**: Dark/Light modes synced from dashboard via `?theme=` URL param
- **Colors**: Primary sky blue (#0284c7), Secondary amber (#f59e0b)
- **Border Radius**: 14px small, 20px large containers
- **Typography**: Use `variant="inherit"` in Typography inside tables for consistent font size

## Data Flow Architecture

### PSV Sizing Calculation
1. User opens `SizingWorkspace` for a sizing case
2. `calculateNetworkPressureDropWithWarnings()` runs hydraulic calculations
3. Results stored via `applyHydraulicSegmentsToNetwork()` → updates local networks
4. On "Save & Close" → `onSaveNetworks()` persists networks to PSV via `updatePsv()`
5. `SummaryTab` reads from `selectedPsv.inletNetwork/outletNetwork`

### State Management
- **`usePsvStore`**: Main store for PSV data, navigation, CRUD operations
- **`useAuthStore`**: Current user, permissions, role-based access
- **Local state**: Component-level for UI state (dialogs, tabs, form inputs)

## Current State (Dec 14, 2025)

### Completed Features
1. Full hierarchy navigation (Customer → Plant → Unit → Area → PSV)
2. Overpressure scenario management with governing case selection
3. PSV sizing calculation (API-520 gas/liquid/steam/two-phase)
4. Inlet/Outlet hydraulic network design and validation
5. Hydraulic pressure drop calculations with choked flow detection
6. Mach number warnings for high-velocity gas flow
7. Printable summary tab with all sizing details
8. Notes/Comments/Tasks collaboration features
9. Workflow status management (Draft → In Review → Checked → Approved → Issued)
10. Theme toggle and dashboard integration
11. Local storage persistence for demo/offline mode
12. Activity tracking and logging
13. Unit conversion system for display preferences
14. Equipment linked fire case calculations
15. PDF export for summary reports
16. Edit / Save conflict resolution

### Pending Features
1. Integration with Network-editor tool for hydraulic network visualizatio

### Configuration Notes
- `tsconfig.json` extends `../../packages/typescript-config/app.json`
- `next.config.ts` has `basePath: "/psv"` and `transpilePackages` for shared packages
- Path alias `@eng-suite/physics` maps to `../../packages/physics-engine/src/index.ts`
- Path alias `@eng-suite/api` maps to `../../packages/api-std/src/index.ts`

## Development Notes
- **State**: Uses Zustand, no prop drilling
- **Navigation**: Store-based, not URL routing
- **Data**: Demo mode uses localStorage, API mode uses backend
- **Styling**: MUI sx prop with glassmorphism patterns
- **Validation**: `inputValidation.ts` for form validation, `hydraulicValidation.ts` for physics

## Next Tasks
