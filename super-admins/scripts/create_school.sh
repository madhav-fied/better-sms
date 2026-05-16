#!/usr/bin/env bash
# Create a new school via the superadmin API.
# Usage: ./create_school.sh
# All inputs are prompted interactively. Set SUPERADMIN_API_KEY and API_BASE_URL
# in the environment or in a .env file in this directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
SUPERADMIN_API_KEY="${SUPERADMIN_API_KEY:-}"

if [[ -z "$SUPERADMIN_API_KEY" ]]; then
  echo "Error: SUPERADMIN_API_KEY is not set. Copy .env.example to .env and fill it in."
  exit 1
fi

echo "=== Create School ==="
read -rp "School name              : " NAME
read -rp "Branch name (optional)   : " BRANCH
read -rp "Address (optional)       : " ADDRESS
read -rp "Phone (optional)         : " PHONE
read -rp "Email (optional)         : " EMAIL
read -rp "Attendance mode [period] : " ATT_MODE
ATT_MODE="${ATT_MODE:-period}"
read -rp "Uses Saturday? [y/N]     : " USES_SAT
USES_SAT="${USES_SAT:-n}"
[[ "$USES_SAT" =~ ^[Yy]$ ]] && USES_SATURDAY=true || USES_SATURDAY=false

PAYLOAD=$(jq -n \
  --arg name        "$NAME" \
  --arg branch_name "$BRANCH" \
  --arg address     "$ADDRESS" \
  --arg phone       "$PHONE" \
  --arg email       "$EMAIL" \
  --arg att_mode    "$ATT_MODE" \
  --argjson sat     "$USES_SATURDAY" \
  '{
    name: $name,
    branch_name: (if $branch_name == "" then null else $branch_name end),
    address:     (if $address     == "" then null else $address     end),
    phone:       (if $phone       == "" then null else $phone       end),
    email:       (if $email       == "" then null else $email       end),
    attendance_mode: $att_mode,
    uses_saturday:   $sat
  }')

echo ""
echo "Sending request to $API_BASE_URL/api/v1/schools ..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_BASE_URL/api/v1/schools" \
  -H "Authorization: Bearer $SUPERADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo ""
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "School created successfully!"
  echo "$BODY" | jq .
  SCHOOL_ID=$(echo "$BODY" | jq -r '.data.id')
  echo ""
  echo "-----------------------------------------------------"
  echo "  School ID : $SCHOOL_ID"
  echo "  Save this — you'll need it when creating admin users"
  echo "-----------------------------------------------------"
else
  echo "Error (HTTP $HTTP_CODE):"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  exit 1
fi
