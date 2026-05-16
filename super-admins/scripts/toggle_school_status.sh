#!/usr/bin/env bash
# Activate or deactivate a school.
# Usage:
#   ./toggle_school_status.sh <school_id> activate
#   ./toggle_school_status.sh <school_id> deactivate

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
SUPERADMIN_API_KEY="${SUPERADMIN_API_KEY:-}"

if [[ -z "$SUPERADMIN_API_KEY" ]]; then
  echo "Error: SUPERADMIN_API_KEY is not set."
  exit 1
fi

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <school_id> <activate|deactivate>"
  exit 1
fi

SCHOOL_ID="$1"
ACTION="$2"

case "$ACTION" in
  activate)   IS_ACTIVE=true  ;;
  deactivate) IS_ACTIVE=false ;;
  *)
    echo "Error: action must be 'activate' or 'deactivate'"
    exit 1
    ;;
esac

PAYLOAD=$(jq -n --argjson active "$IS_ACTIVE" '{"is_active": $active}')

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PATCH "$API_BASE_URL/api/v1/schools/$SCHOOL_ID/status" \
  -H "Authorization: Bearer $SUPERADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" == "200" ]]; then
  STATUS=$(echo "$BODY" | jq -r '.data.is_active')
  NAME=$(echo "$BODY" | jq -r '.data.name')
  echo "OK — '$NAME' is now $([ "$STATUS" = "true" ] && echo 'ACTIVE' || echo 'INACTIVE')."
else
  echo "Error (HTTP $HTTP_CODE):"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  exit 1
fi
