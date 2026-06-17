#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${1:?region required}"
ECS_CLUSTER="${ECS_CLUSTER:?ECS_CLUSTER is required}"

SERVICES=(
  api
  web
  docs
  network-editor
  psv
  design-agents
  venting-calculation
  vessels-calculation
  pump-calculation
  heat-transfer-calculation
  control-valve-calculation
)

for service in "${SERVICES[@]}"; do
  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$service" \
    --task-definition "process-engineering-${service}" \
    --force-new-deployment \
    --region "$AWS_REGION"

  aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER" \
    --services "$service" \
    --region "$AWS_REGION"
done
