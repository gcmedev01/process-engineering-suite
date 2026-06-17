#!/bin/bash

set -euo pipefail

AWS_REGION="${1:-us-east-1}"
AWS_ACCOUNT_ID="${2:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)}"
API_URL="${API_URL:?API_URL is required for AWS frontend build}"
DOCS_URL="${DOCS_URL:?DOCS_URL is required for AWS frontend build}"
NETWORK_EDITOR_URL="${NETWORK_EDITOR_URL:?NETWORK_EDITOR_URL is required for AWS frontend build}"
PSV_URL="${PSV_URL:?PSV_URL is required for AWS frontend build}"
DESIGN_AGENTS_URL="${DESIGN_AGENTS_URL:?DESIGN_AGENTS_URL is required for AWS frontend build}"
VENTING_URL="${VENTING_URL:?VENTING_URL is required for AWS frontend build}"
VESSELS_CALCULATION_URL="${VESSELS_CALCULATION_URL:?VESSELS_CALCULATION_URL is required for AWS frontend build}"
PUMP_URL="${PUMP_URL:?PUMP_URL is required for AWS frontend build}"
HEAT_TRANSFER_URL="${HEAT_TRANSFER_URL:?HEAT_TRANSFER_URL is required for AWS frontend build}"
CONTROL_VALVE_URL="${CONTROL_VALVE_URL:?CONTROL_VALVE_URL is required for AWS frontend build}"
NEXT_PUBLIC_AUTH_API_URL="${AUTH_API_URL:-$API_URL}"
API_PROXY_TARGET="${API_PROXY_TARGET:-$API_URL}"
VITE_API_URL="${VITE_API_URL:-$API_URL}"

build_and_push_image() {
  local repo="$1"
  shift
  docker build \
    "$@" \
    -t "${ECR_BASE}/process-engineering/${repo}:${IMAGE_TAG}" \
    -t "${ECR_BASE}/process-engineering/${repo}:latest" \
    .
  docker push "${ECR_BASE}/process-engineering/${repo}:${IMAGE_TAG}"
  docker push "${ECR_BASE}/process-engineering/${repo}:latest"
}

build_next_app() {
  local repo="$1"
  local app_name="$2"
  local base_path="$3"
  shift 3
  build_and_push_image "$repo" \
    --build-arg APP_NAME="${app_name}" \
    --build-arg BASE_PATH="${base_path}" \
    --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
    --build-arg NEXT_PUBLIC_AUTH_API_URL="${NEXT_PUBLIC_AUTH_API_URL}" \
    --build-arg API_PROXY_TARGET="${API_PROXY_TARGET}" \
    "$@" \
    -f infra/docker/Dockerfile.frontend
}

echo "=========================================="
echo "Building and Pushing Docker Images to ECR"
echo "=========================================="
echo "AWS Region: $AWS_REGION"
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "ECR Base: $ECR_BASE"
echo "Project Root: $PROJECT_ROOT"
echo "Image Tag: $IMAGE_TAG"
echo ""

echo "Authenticating to AWS ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE"

echo ""
echo "Creating ECR repositories (if they don't exist)..."
for repo in \
  api \
  web \
  docs \
  network-editor \
  psv \
  design-agents \
  venting-calculation \
  vessels-calculation \
  pump-calculation \
  heat-transfer-calculation \
  control-valve-calculation
do
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

cd "$PROJECT_ROOT"

echo ""
echo "=========================================="
echo "Building API (Python FastAPI)"
echo "=========================================="
build_and_push_image api -f infra/docker/Dockerfile.api
echo "✓ API pushed successfully"

echo ""
echo "=========================================="
echo "Building Web (Next.js)"
echo "=========================================="
build_next_app web web "" \
  --build-arg DOCS_URL="${DOCS_URL}" \
  --build-arg NETWORK_EDITOR_URL="${NETWORK_EDITOR_URL}" \
  --build-arg PSV_URL="${PSV_URL}" \
  --build-arg DESIGN_AGENTS_URL="${DESIGN_AGENTS_URL}" \
  --build-arg VENTING_URL="${VENTING_URL}" \
  --build-arg VESSELS_CALCULATION_URL="${VESSELS_CALCULATION_URL}" \
  --build-arg PUMP_URL="${PUMP_URL}" \
  --build-arg HEAT_TRANSFER_URL="${HEAT_TRANSFER_URL}" \
  --build-arg CONTROL_VALVE_URL="${CONTROL_VALVE_URL}"
echo "✓ Web pushed successfully"

echo ""
echo "=========================================="
echo "Building Docs (Next.js)"
echo "=========================================="
build_next_app docs docs /docs
echo "✓ Docs pushed successfully"

echo ""
echo "=========================================="
echo "Building Network Editor (Next.js)"
echo "=========================================="
build_next_app network-editor network-editor /network-editor
echo "✓ Network Editor pushed successfully"

echo ""
echo "=========================================="
echo "Building PSV (Next.js)"
echo "=========================================="
build_next_app psv psv /psv
echo "✓ PSV pushed successfully"

echo ""
echo "=========================================="
echo "Building Venting Calculation (Next.js)"
echo "=========================================="
build_next_app venting-calculation venting-calculation /venting-calculation
echo "✓ Venting Calculation pushed successfully"

echo ""
echo "=========================================="
echo "Building Vessels Calculation (Next.js)"
echo "=========================================="
build_next_app vessels-calculation vessels-calculation /vessels-calculation
echo "✓ Vessels Calculation pushed successfully"

echo ""
echo "=========================================="
echo "Building Pump Calculation (Next.js)"
echo "=========================================="
build_next_app pump-calculation pump-calculation /pump-calculation
echo "✓ Pump Calculation pushed successfully"

echo ""
echo "=========================================="
echo "Building Heat Transfer Calculation (Next.js)"
echo "=========================================="
build_next_app heat-transfer-calculation heat-transfer-calculation /heat-transfer-calculation
echo "✓ Heat Transfer Calculation pushed successfully"

echo ""
echo "=========================================="
echo "Building Control Valve Calculation (Next.js)"
echo "=========================================="
build_next_app control-valve-calculation control-valve-calculation /control-valve-calculation
echo "✓ Control Valve Calculation pushed successfully"

echo ""
echo "=========================================="
echo "Building Design Agents (Vite + Nginx)"
echo "=========================================="
build_and_push_image design-agents \
  --build-arg VITE_API_URL="${VITE_API_URL}" \
  -f infra/docker/Dockerfile.vite
echo "✓ Design Agents pushed successfully"

echo ""
echo "=========================================="
echo "All images built and pushed successfully!"
echo "=========================================="
echo ""
echo "Image URIs:"
for repo in \
  api \
  web \
  docs \
  network-editor \
  psv \
  design-agents \
  venting-calculation \
  vessels-calculation \
  pump-calculation \
  heat-transfer-calculation \
  control-valve-calculation
do
  echo "  ${repo}: ${ECR_BASE}/process-engineering/${repo}:${IMAGE_TAG}"
done
