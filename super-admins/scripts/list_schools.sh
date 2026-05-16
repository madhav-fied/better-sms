#!/usr/bin/env bash
# List all schools registered on the platform.
# Usage: ./list_schools.sh [--page N] [--limit N]

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

PAGE=1
LIMIT=50

while [[ $# -gt 0 ]]; do
  case $1 in
    --page)  PAGE="$2";  shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "$API_BASE_URL/api/v1/schools?page=$PAGE&limit=$LIMIT" \
  -H "Authorization: Bearer $SUPERADMIN_API_KEY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "$BODY" | jq -r '
    "Total schools: \(.meta.total)  (page \(.meta.page) of \((.meta.total / .meta.limit | ceil)))\n",
    (.data[] | "  \(.id)  [\(if .is_active then "active" else "INACTIVE" end)]  \(.name)\(if .branch_name then " — \(.branch_name)" else "" end)")
  '
else
  echo "Error (HTTP $HTTP_CODE):"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  exit 1
fi
