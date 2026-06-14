#!/bin/bash
# Build and push all Docker images to AWS ECR
# Usage: ./build-and-push.sh [REGION] [ACCOUNT_ID]

set -e  # Exit on error

# Configuration
AWS_REGION="${1:-us-east-1}"
AWS_ACCOUNT_ID="${2:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

# Build-time API target for the frontends. Next.js inlines NEXT_PUBLIC_* and
# resolves rewrite proxy targets at BUILD time, so this must be set here, not
# in the ECS task definition. Override via the API_URL env var, e.g.
#   API_URL=https://api.example.com ./build-and-push.sh
API_URL="${API_URL:-}"

echo "=========================================="
echo "Building and Pushing Docker Images to ECR"
echo "=========================================="
echo "AWS Region: $AWS_REGION"
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "ECR Base: $ECR_BASE"
echo "Project Root: $PROJECT_ROOT"
echo ""

# Authenticate to ECR
echo "Authenticating to AWS ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$ECR_BASE"

# Create ECR repositories if they don't exist
echo ""
echo "Creating ECR repositories (if they don't exist)..."
for repo in api web network-editor psv design-agents; do
    aws ecr describe-repositories \
        --repository-names "process-engineering/$repo" \
        --region "$AWS_REGION" > /dev/null 2>&1 || \
    aws ecr create-repository \
        --repository-name "process-engineering/$repo" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
    echo "✓ Repository: process-engineering/$repo"
done

# Build and push API
echo ""
echo "=========================================="
echo "Building API (Python FastAPI)"
echo "=========================================="
cd "$PROJECT_ROOT"
docker build \
    -f infra/docker/Dockerfile.api \
    -t "${ECR_BASE}/process-engineering/api:latest" \
    .
docker push "${ECR_BASE}/process-engineering/api:latest"
echo "✓ API pushed successfully"

# Build and push Web
echo ""
echo "=========================================="
echo "Building Web (Next.js)"
echo "=========================================="
docker build \
    --build-arg APP_NAME=web \
    --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
    --build-arg API_PROXY_TARGET="${API_URL}" \
    -f infra/docker/Dockerfile.frontend \
    -t "${ECR_BASE}/process-engineering/web:latest" \
    .
docker push "${ECR_BASE}/process-engineering/web:latest"
echo "✓ Web pushed successfully"

# Build and push Network Editor
echo ""
echo "=========================================="
echo "Building Network Editor (Next.js)"
echo "=========================================="
docker build \
    --build-arg APP_NAME=network-editor \
    --build-arg BASE_PATH=/network-editor \
    --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
    --build-arg API_PROXY_TARGET="${API_URL}" \
    -f infra/docker/Dockerfile.frontend \
    -t "${ECR_BASE}/process-engineering/network-editor:latest" \
    .
docker push "${ECR_BASE}/process-engineering/network-editor:latest"
echo "✓ Network Editor pushed successfully"

# Build and push PSV
echo ""
echo "=========================================="
echo "Building PSV (Next.js)"
echo "=========================================="
docker build \
    --build-arg APP_NAME=psv \
    --build-arg BASE_PATH=/psv \
    --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
    --build-arg API_PROXY_TARGET="${API_URL}" \
    -f infra/docker/Dockerfile.frontend \
    -t "${ECR_BASE}/process-engineering/psv:latest" \
    .
docker push "${ECR_BASE}/process-engineering/psv:latest"
echo "✓ PSV pushed successfully"

# Build and push Design Agents
echo ""
echo "=========================================="
echo "Building Design Agents (Vite + Nginx)"
echo "=========================================="
docker build \
    -f infra/docker/Dockerfile.vite \
    -t "${ECR_BASE}/process-engineering/design-agents:latest" \
    .
docker push "${ECR_BASE}/process-engineering/design-agents:latest"
echo "✓ Design Agents pushed successfully"

echo ""
echo "=========================================="
echo "All images built and pushed successfully!"
echo "=========================================="
echo ""
echo "Image URIs:"
echo "  API: ${ECR_BASE}/process-engineering/api:latest"
echo "  Web: ${ECR_BASE}/process-engineering/web:latest"
echo "  Network Editor: ${ECR_BASE}/process-engineering/network-editor:latest"
echo "  PSV: ${ECR_BASE}/process-engineering/psv:latest"
echo "  Design Agents: ${ECR_BASE}/process-engineering/design-agents:latest"
echo ""
echo "Next steps:"
echo "1. Update task definitions with these image URIs"
echo "2. Register task definitions: aws ecs register-task-definition --cli-input-json file://infra/aws/task-definitions/api.json"
echo "3. Update ECS services to use new task definitions"
