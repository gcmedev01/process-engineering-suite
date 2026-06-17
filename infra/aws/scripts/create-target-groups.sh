#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${1:?region required}"
VPC_ID="${2:?vpc id required}"

create_target_group() {
  local port="$1"
  local health_path="$2"
  local target_group_name="$3"

  aws elbv2 create-target-group \
    --name "$target_group_name" \
    --protocol HTTP \
    --port "$port" \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path "$health_path" \
    --region "$AWS_REGION"
}

create_target_group 8000 /health pe-api
create_target_group 3000 / pe-web
create_target_group 3000 /docs pe-docs
create_target_group 3000 /network-editor pe-network-editor
create_target_group 3000 /psv pe-psv
create_target_group 80 /design-agents/ pe-design-agents
create_target_group 3000 /venting-calculation pe-venting-calculation
create_target_group 3000 /vessels-calculation pe-vessels-calculation
create_target_group 3000 /pump-calculation pe-pump-calculation
create_target_group 3000 /heat-transfer-calculation pe-heat-transfer-calculation
create_target_group 3000 /control-valve-calculation pe-control-valve-calculation
