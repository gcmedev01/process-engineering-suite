# Web Dashboard

Main entry point for the Process Engineering Suite, providing unified navigation and theme management across all applications.

## Overview

The dashboard serves as the central hub for the Process Engineering Suite, offering:

- **Unified Navigation**: Access to all suite applications (PSV, Network Editor, API)
- **Theme Management**: Global dark/light mode with synchronization across apps
- **User Management**: Authentication status and user profile access
- **Application Health**: Status indicators for all connected services

## Quick Start

```bash
# From monorepo root
bun install
bun run dev

# Or run dashboard directly
cd apps/web
bun run dev
```

The dashboard runs on `http://localhost:3000` and provides navigation to:

- PSV Sizing: http://localhost:3000/psv
- Network Editor: http://localhost:3000/network-editor
- Design Agents: http://localhost:3000/design-agents/
- Venting Calculation: http://localhost:3000/venting-calculation
- Vessels Calculation: http://localhost:3000/vessels-calculation
- Pump Calculation: http://localhost:3000/pump-calculation
- Heat Transfer Calculation: http://localhost:3000/heat-transfer-calculation
- Control Valve Calculation: http://localhost:3000/control-valve-calculation
- API Documentation: http://localhost:3000/api-docs

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: Material UI 7
- **State Management**: Zustand (theme synchronization)
- **Language**: TypeScript
- **Styling**: MUI with glassmorphism theme system

## Project Structure

```
apps/web/
├── src/
│   ├── app/              # Next.js app router with navigation
│   ├── components/       # Dashboard components and navigation
│   ├── contexts/         # Theme context provider
│   └── lib/              # Theme utilities and API clients
├── public/               # Static assets
└── next.config.ts        # Next.js configuration
```

## Current Status

**Production Ready** - The dashboard provides stable navigation and theme management for the entire suite.

### Implemented ✅

- Responsive navigation interface
- Theme toggle with persistence
- Application status indicators
- User authentication display
- Cross-app theme synchronization
- Mobile-friendly design

## Deployment

The dashboard is deployed as part of the Process Engineering Suite using Docker.

### Docker Deployment

```bash
# From monorepo root
docker build -t process-engineering-suite .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://your-api-server:8000 \
  process-engineering-suite
```

### Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API endpoint (default: http://localhost:8000)

### Health Check

```bash
curl http://localhost:3000/api/health
```

## Theme System

The dashboard manages global theming with:

- **Automatic Synchronization**: Theme changes propagate to all applications
- **Persistence**: User theme preferences saved across sessions
- **System Detection**: Respects user's system dark/light mode preference
- **Glassmorphism**: Modern UI aesthetic with backdrop blur effects

### Theme Configuration

```typescript
// Default theme settings
const themeOptions = {
  palette: {
    mode: "light", // or 'dark'
    primary: { main: "#1976d2" },
    // ... additional colors
  },
  glassmorphism: {
    backdropFilter: "blur(10px)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
};
```

## Navigation Structure

```
/ (Dashboard Home)
├── /psv (PSV Sizing Application)
├── /network-editor (Network Editor)
├── /design-agents (Design Agents)
├── /venting-calculation (Venting Calculation)
├── /vessels-calculation (Vessels Calculation)
├── /pump-calculation (Pump Calculation)
├── /heat-transfer-calculation (Heat Transfer Calculation)
├── /control-valve-calculation (Control Valve Calculation)
└── /api-docs (API Documentation)
```

## Related Documentation

- [Deployment Guide](../../docs/DEPLOYMENT.md) - Complete deployment instructions
- [Environment Variables](../../docs/ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Docker Development](../../docs/DOCKER_DEVELOPMENT.md) - Container operations
- [Troubleshooting](../../docs/TROUBLESHOOTING.md) - Issue resolution
