#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${1:?region required}"
AWS_ACCOUNT_ID="${2:?account id required}"
IMAGE_TAG="${3:?image tag required}"

SRC_DIR="infra/aws/task-definitions/templates"
OUT_DIR="infra/aws/task-definitions/rendered"

mkdir -p "$OUT_DIR"

for file in "$SRC_DIR"/*.json; do
  name="$(basename "$file")"
  sed \
    -e "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" \
    -e "s/REGION/${AWS_REGION}/g" \
    -e "s/IMAGE_TAG/${IMAGE_TAG}/g" \
    "$file" > "$OUT_DIR/$name"
done
