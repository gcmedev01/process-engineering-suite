# API Backend

FastAPI backend for the Process Engineering Suite, providing data management, authentication, and hydraulic calculations.

## Overview

This API serves as the central data layer for the Process Engineering Suite, offering:

- **Data Management**: CRUD operations for PSV data, hierarchies, and user management
- **Authentication**: User authentication with role-based permissions
- **Hydraulic Calculations**: Backend calculation engine for complex hydraulic analysis
- **File Handling**: Attachment storage and management
- **Revision Control**: Version tracking and approval workflows

## Tech Stack

- **Framework**: FastAPI (Python async web framework)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with role-based access control
- **Documentation**: Auto-generated OpenAPI/Swagger docs
- **Deployment**: Docker with uvicorn ASGI server

## Quick Start

### Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/engsuite"
export SECRET_KEY="your-secret-key"

# Run development server
uvicorn main:app --reload --port 8000
```

### Docker

```bash
# Build and run
docker build -t process-engineering-api .
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://user:pass@postgres:5432/engsuite" \
  -e SECRET_KEY="your-secret-key" \
  process-engineering-api
```

## API Documentation

Once running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Key Endpoints

### Authentication

- `POST /auth/login` - User authentication
- `GET /auth/me` - Current user info

### Hierarchy Management

- `GET /hierarchy/customers` - List customers
- `POST /hierarchy/customers` - Create customer
- `GET /hierarchy/customers/{id}/plants` - Customer plants

### PSV Management

- `GET /psv` - List PSVs
- `POST /psv` - Create PSV
- `GET /psv/{id}` - Get PSV details

### Hydraulic Calculations

- `POST /calculate/network` - Network hydraulic analysis
- `POST /calculate/psv-sizing` - PSV sizing calculations

## Database Setup

### PostgreSQL

```bash
# Create database
createdb engsuite

# Run migrations
alembic upgrade head

# Seed with mock data (optional)
curl -X POST http://localhost:8000/admin/seed-from-mock
```

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key (required for production)
- `USE_MOCK_DATA`: Fallback to in-memory data (development only)

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=.

# Run specific test
pytest tests/test_auth.py
```

## Deployment

The API is deployed as part of the Process Engineering Suite Docker container.

### Production Configuration

```bash
# Environment setup
export DATABASE_URL="postgresql+asyncpg://prod-user:prod-pass@postgres:5432/engsuite"
export SECRET_KEY="$(openssl rand -hex 32)"
export USE_MOCK_DATA=false

# Run in production
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Health Checks

```bash
# API health
curl http://localhost:8000/health

# Database connectivity
curl http://localhost:8000/admin/data-source
```

## Development

### Adding New Endpoints

```python
from fastapi import APIRouter
from .dependencies import get_db

router = APIRouter()

@router.get("/items/")
async def read_items(db: Session = Depends(get_db)):
    return db.query(Item).all()
```

### Database Migrations

```bash
# Generate migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations (Docker/Production - uses /app paths)
alembic upgrade head

# Apply migrations (Local Development - uses relative paths)
alembic -c alembic.local.ini upgrade head

# Check current revision
alembic -c alembic.local.ini current

# Show migration history
alembic -c alembic.local.ini history
```

> **Note**: Use `alembic.local.ini` for local development. The default `alembic.ini` uses Docker paths (`/app/...`).

## Related Documentation

- [Deployment Guide](../../docs/DEPLOYMENT.md) - Complete deployment instructions
- [Environment Variables](../../docs/ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Docker Development](../../docs/DOCKER_DEVELOPMENT.md) - Container operations
- [Backup & Restore](../../docs/BACKUP_RESTORE.md) - Data management
