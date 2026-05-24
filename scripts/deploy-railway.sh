#!/usr/bin/env bash
# Deploy FastAPI backend + Postgres on Railway (run from repo root after `railway login`).
set -euo pipefail
cd "$(dirname "$0")/../server"

RAILWAY="${RAILWAY:-npx @railway/cli}"

if ! $RAILWAY whoami &>/dev/null; then
  echo "Run: railway login  (or set RAILWAY_API_TOKEN / RAILWAY_TOKEN)"
  exit 1
fi

if [[ ! -f .railway/project.json ]]; then
  $RAILWAY init --name better-sms-api
fi

# Add Postgres if not already linked
if ! $RAILWAY variables 2>/dev/null | grep -q DATABASE_URL; then
  $RAILWAY add --database postgres
fi

# Production secrets (override via env before running)
$RAILWAY variables set \
  SUPERADMIN_API_KEY="${SUPERADMIN_API_KEY:-$(openssl rand -hex 32)}"

$RAILWAY up --detach
echo ""
echo "After deploy, set the public domain:"
echo "  railway domain"
echo "  railway open"
