FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    postgresql-client \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements separately to cache install
COPY services/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
# We expect the build context to be the repository root
COPY services/api /app/services/api
COPY packages /app/packages
COPY services /app/services

# Add /app and calc-engine hydraulics to PYTHONPATH
ENV PYTHONPATH=/app:/app/services/calc-engine:/app/services/calc-engine/hydraulics

# Expose port
EXPOSE 8000

# Run in production mode (no reload)
CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
