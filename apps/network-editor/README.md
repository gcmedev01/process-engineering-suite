# Network Editor Application

A powerful hydraulic network design and simulation tool, part of the Process Engineering Suite. Features drag-and-drop interface for modeling fluid networks with real-time hydraulic calculations.

## Overview

This application enables engineers to:

- **Visual Network Design**: Create fluid networks using an intuitive drag-and-drop interface
- **Hydraulic Calculations**: Perform incompressible flow calculations with pressure drop analysis
- **Component Management**: Configure pipes, pumps, valves, and other network components
- **Real-time Analysis**: Instant feedback on network performance and pressure distributions
- **Excel Integration**: Import/export network designs and calculation results

## Quick Start

```bash
# From monorepo root
bun install
bun run dev

# Or run Network Editor directly
cd apps/network-editor
bun run dev
```

The app runs on `http://localhost:3002` and is accessible via the dashboard at `http://localhost:3000/network-editor`.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: Material UI 7
- **Diagramming**: React Flow
- **State Management**: Zustand
- **Language**: TypeScript
- **Styling**: MUI sx prop with glassmorphism theme

## Project Structure

```
apps/network-editor/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components and network elements
│   ├── contexts/         # React contexts
│   ├── lib/              # Hydraulic calculations and utilities
│   └── store/            # Zustand state management
├── public/               # Static assets
└── next.config.ts        # Next.js configuration
```

## Current Status

**Production Ready** - The application provides full hydraulic network modeling capabilities with comprehensive calculation engine.

### Implemented ✅

- Drag-and-drop network design interface
- Hydraulic calculations for incompressible flow
- Pipe and node property management
- Real-time pressure and flow analysis
- Excel import/export functionality
- Network validation and error checking
- Responsive design with theme support
- Dashboard integration

## Deployment

The Network Editor is deployed as part of the Process Engineering Suite using Docker.

### Docker Deployment

```bash
# From monorepo root
docker build -t process-engineering-suite .
docker run -p 3002:3002 \
  -e NEXT_PUBLIC_API_URL=http://your-api-server:8000 \
  process-engineering-suite
```

### Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API endpoint for calculations (default: http://localhost:8000)

### Health Check

```bash
curl http://localhost:3002/api/health
```

For complete deployment instructions, see the main [Deployment Guide](../../docs/DEPLOYMENT_GUIDE.md).

## Related Documentation

- [Deployment Guide](../../docs/DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Environment Variables](../../docs/ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Docker Deployment](../../docs/DOCKER_DEPLOYMENT.md) - Container operations
- [Troubleshooting](../../docs/TROUBLESHOOTING.md) - Issue resolution
