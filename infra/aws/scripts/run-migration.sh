#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${1:?region required}"
ECS_CLUSTER="${ECS_CLUSTER:?ECS_CLUSTER is required}"
ECS_TASK_DEFINITION="${ECS_TASK_DEFINITION:-process-engineering-api-migration}"
ECS_PRIVATE_SUBNETS="${ECS_PRIVATE_SUBNETS:?ECS_PRIVATE_SUBNETS is required}"
ECS_SECURITY_GROUPS="${ECS_SECURITY_GROUPS:?ECS_SECURITY_GROUPS is required}"

aws ecs run-task \
  --cluster "$ECS_CLUSTER" \
  --task-definition "$ECS_TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$ECS_PRIVATE_SUBNETS],securityGroups=[$ECS_SECURITY_GROUPS],assignPublicIp=DISABLED}" \
  --region "$AWS_REGION" \
  --count 1
