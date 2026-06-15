# Developing the PSV Application

## Development Setup

### Prerequisites
- Node.js 18+
- Bun

### Running Locally

```bash
# From monorepo root
bun install
bun run dev

# PSV app runs on http://localhost:3003
# Dashboard runs on http://localhost:3000
# Access PSV via dashboard: http://localhost:3000/psv
```

### Building

```bash
cd apps/psv
bun run build
```

## Architecture

### State Management

The app uses **Zustand** for global state:

```
src/store/usePsvStore.ts
├── selection        # Current hierarchy selection (customerId, plantId, etc.)
├── selectedProject  # Derived: full Project object
├── selectedPsv      # Derived: full ProtectiveSystem object
└── actions          # selectCustomer, selectPlant, selectProject, etc.
```

Auth (demo mode) uses Zustand with `localStorage` persistence:

```
src/store/useAuthStore.ts
├── login/logout
├── updateUserProfile (name/email/initials)
├── changePassword
└── permission helpers (canEdit/canApprove/canManageUsers, etc.)
```

### Component Structure

```
TopToolbar          # Fixed header with back button, search, theme toggle
├── Breadcrumbs     # Shows navigation path
├── HierarchyBrowser # Customer/Plant/Unit/Area/Project list
├── ProtectiveSystemList # PSV/RD cards for selected project
└── ProtectiveSystemDetail # Tabbed detail view
    ├── Overview Tab
    ├── Scenarios Tab
    ├── Sizing Tab
    ├── Revisions Tab
    └── Attachments Tab
    └── Summary Tab
```

### Data Layer

The PSV frontend can run against either:
- **Backend API** (`NEXT_PUBLIC_API_URL`) for Postgres-backed data, or
- **Local storage demo mode** (fallback) for offline/demo operation.

Core types and demo seed data:

- `types.ts` - TypeScript interfaces for domain model
- `mockData.ts` - Sample data with petrochemical examples

Service selection is centralized:
- `src/lib/api.ts` exports an API client and `getDataService()` which chooses API vs local storage.

## Key Patterns

### Theme Sync

Theme is passed from dashboard via URL parameter:
1. Dashboard's `AppCard` adds `?theme=dark` or `?theme=light`
2. PSV's `providers.tsx` reads `searchParams.get('theme')`
3. Falls back to `localStorage` if no param

### Shared Components

Uses `@eng-suite/ui-kit` for:
- `TopFloatingToolbar` - Consistent header across apps
- `IOSListGroup`, `IOSListItem` - iOS-style list components
- `glassStyles` - Glassmorphism styling utilities

### Navigation

Uses Zustand store for navigation (not URL routing):
- Clicking items updates store selection
- Breadcrumbs read from store and allow navigation back
- Main page conditionally renders based on selection state

## Revision Control

Revision records are stored in `revision_history` and referenced by entities via `currentRevisionId`.

- Signing sequence:
  - Originator → Checker → Approver (approver requires Lead/Approver/Admin).
  - Revoke is supported (clears fields; higher roles can revoke others).
- PSV status progression (derived from current revision signatures; Issued stays Issued):
  - no originator → Draft
  - originator only → In Review
  - originator + checker → Checked
  - originator + checker + approver → Approved

UI surfaces:
- `Revisions` tab (PSV detail)
- `RevisionHistoryPanel` (drawer)
- `RevisionHistoryCard` (Summary)

## Admin Dashboard

The PSV app includes an admin-style dashboard (role-gated) for managing:
- Customers / Plants / Units / Areas / Projects / PSVs / Equipment
- Users (admin-only)
- System (admin-only): Backup / Restore

## Backup / Restore (Dev)

- UI: Dashboard → `System` tab
- API:
  - `GET /admin/backup` (DB mode -> `.sql`, mock mode -> JSON export)
  - `POST /admin/restore` (DB mode expects `.sql`, mock mode expects `.json`)
  - `GET /admin/export-mock-data?write_to_file=true` writes `services/api/mock_data.json` from the running database

## Next Steps for Development

This project is active; treat this section as a scratchpad for future work.

## Code Conventions

- Use MUI `sx` prop for styles (not styled-components)
- Theme-aware colors: `isDark ? 'dark-color' : 'light-color'`
- Glassmorphism: `backdropFilter: 'blur(12px)'`
- Border radius: 14px for small, 20px for large containers
