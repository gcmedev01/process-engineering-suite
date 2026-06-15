# PSV Sizing Application

A pressure safety valve (PSV) sizing and overpressure protection management tool, part of the Process Engineering Suite.

## Overview

This application helps engineers manage PSV/RD (Pressure Safety Valve / Rupture Disc) sizing for process plants. It provides:

- **Hierarchy Navigation**: Browse customers → plants → units → areas → projects
- **Protective System Management**: View and manage PSVs and RDs with status tracking
- **Overpressure Scenarios**: Document relief scenarios with API 521 code references
- **Sizing Calculations**: Size valves per ASME VIII / API 520 standards
- **Data Organization**: Attach files, notes, and link to protected equipment

## Quick Start

```bash
# From monorepo root
bun install
bun run dev

# Or run PSV app directly
cd apps/psv
bun run dev
```

The app runs on `http://localhost:3003` and is accessible via the dashboard at `http://localhost:3000/psv`.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: Material UI 7
- **State Management**: Zustand
- **Language**: TypeScript
- **Styling**: MUI sx prop with glassmorphism theme

## Project Structure

```
apps/psv/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── contexts/         # React contexts (ColorMode)
│   ├── data/             # Mock data and types
│   ├── store/            # Zustand state management
│   └── lib/              # Utilities and export functions
├── public/               # Static assets
├── docs/                 # Application documentation
└── next.config.ts        # Next.js configuration
```

## Deployment

The PSV application is deployed as part of the Process Engineering Suite using Docker.

### Docker Deployment

```bash
# From monorepo root
docker build -t process-engineering-suite .
docker run -p 3003:3003 \
  -e NEXT_PUBLIC_API_URL=http://your-api-server:8000 \
  -e NEXT_PUBLIC_USE_LOCAL_STORAGE=false \
  process-engineering-suite
```

### Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API endpoint (default: http://localhost:8000)
- `NEXT_PUBLIC_USE_LOCAL_STORAGE`: Enable demo mode (default: false)

### Health Check

```bash
curl http://localhost:3003/api/health
```

For complete deployment instructions, see the main [Deployment Guide](../../docs/DEPLOYMENT_GUIDE.md).

## Current Status

**Production Ready** - The app is fully functional with complete backend integration, authentication, and production deployment support.

### Implemented ✅

- Complete hierarchy browser (Customer → Plant → Unit → Area → Project)
- Full protective system management with CRUD operations
- Comprehensive PSV sizing calculations (ASME VIII / API 520)
- Scenario management with API 521 code references
- User authentication (API mode + localStorage demo mode)
- File attachments and notes system
- PDF/Excel export functionality
- Revision control and approval workflows
- Responsive UI with dark/light theme support
- Comprehensive test suite (80+ tests)
- Production-ready build and deployment

### Pending 🚧

- Advanced hydraulic modeling integration (planned for future release)

## Demo Mode (localStorage)

The app supports a **localStorage-based demo mode** for offline use or deployments without a backend API.

### Enable Demo Mode

**Option 1: Environment Variable**

```bash
NEXT_PUBLIC_USE_LOCAL_STORAGE=true bun run dev
```

**Option 2: Create `.env.local`**

```bash
echo "NEXT_PUBLIC_USE_LOCAL_STORAGE=true" > .env.local
bun run dev
```

**Option 3: Vercel Deployment**
Add `NEXT_PUBLIC_USE_LOCAL_STORAGE=true` in Vercel project settings → Environment Variables.

### Demo Credentials

All demo users can login with their username as password:

- `maetee` / `linkinpark` (admin)
- `lead` / `lead` (lead)
- `approver` / `password` (approver)
- `engineer` / `engineer` (engineer)
- `dm` / `password` (division_manager)

### How It Works

- All data operations use browser localStorage instead of API
- Pre-populated with mock data on first visit
- Data persists in each user's browser (not shared)
- No backend server required

## Testing

```bash
# Run all tests
bun run test:run

# Run with coverage
bun run test:run -- --coverage
```

The application includes comprehensive tests covering:

- Component functionality
- API integration
- Store management
- Export features
- Authentication flows

## Related Documentation

- [Deployment Guide](../../docs/DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Environment Variables](../../docs/ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Docker Deployment](../../docs/DOCKER_DEPLOYMENT.md) - Container operations
- [Backup & Restore](../../docs/BACKUP_RESTORE.md) - Data management
- [Troubleshooting](../../docs/TROUBLESHOOTING.md) - Issue resolution
- [DEVELOPING.md](./DEVELOPING.md) - Development guide and architecture
- [GEMINI.md](./GEMINI.md) - AI context for continuity
- [product-overview.md](./product-overview.md) - Product requirements
