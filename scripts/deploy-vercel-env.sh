#!/usr/bin/env bash
# Set NEXT_PUBLIC_API_URL on Vercel and redeploy (run after Railway is live).
set -euo pipefail
API_URL="${1:?Usage: $0 https://your-api.up.railway.app/api/v1}"

cd "$(dirname "$0")/../client/web"
vercel link --yes --project edulink-app
printf '%s' "$API_URL" | vercel env add NEXT_PUBLIC_API_URL production 2>/dev/null || true
vercel deploy --prod --yes
DEPLOY_URL=$(vercel ls --prod 2>/dev/null | awk 'NR==3 {print $2}')
if [ -n "$DEPLOY_URL" ]; then
  vercel alias set "$DEPLOY_URL" edulink-sms-app.vercel.app
  vercel alias set "$DEPLOY_URL" sms-edulink.vercel.app
fi
echo "Production: https://edulink-sms-app.vercel.app"
