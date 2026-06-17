#!/usr/bin/env bash

set -euo pipefail

APP_URL="${APP_URL:?APP_URL is required}"
API_URL="${API_URL:?API_URL is required}"

curl -fsS "$APP_URL/" >/dev/null
curl -fsS "$API_URL/health" >/dev/null
curl -fsS "$APP_URL/docs" >/dev/null
curl -fsS "$APP_URL/network-editor" >/dev/null
curl -fsS "$APP_URL/psv" >/dev/null
curl -fsS "$APP_URL/design-agents/" >/dev/null
curl -fsS "$APP_URL/venting-calculation" >/dev/null
curl -fsS "$APP_URL/vessels-calculation" >/dev/null
curl -fsS "$APP_URL/pump-calculation" >/dev/null
curl -fsS "$APP_URL/heat-transfer-calculation" >/dev/null
curl -fsS "$APP_URL/control-valve-calculation" >/dev/null
