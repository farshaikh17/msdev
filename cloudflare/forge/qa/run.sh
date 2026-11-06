#!/bin/bash
# Full browser QA against a throw-away local copy of Forge, using dummy data only. Run: npm run forge:qa
cd "$(dirname "$0")/../../.." || exit 1
Q=cloudflare/forge/qa
pkill -f "wrangler dev -c $Q" 2>/dev/null; sleep 1
rm -rf $Q/state
npx wrangler d1 migrations apply forge-qa --local -c $Q/wrangler.qa.jsonc --persist-to $Q/state >/dev/null 2>&1 || exit 1
npx wrangler dev -c $Q/wrangler.qa.jsonc --local --persist-to $Q/state --port 8799 > $Q/dev.log 2>&1 &
SERVER=$!
until curl -s -o /dev/null localhost:8799/; do sleep 1; done
NODE_PATH="$(npm root -g):$PWD/node_modules" node $Q/e2e.mjs
CODE=$?
kill $SERVER 2>/dev/null; pkill -f "wrangler dev -c $Q" 2>/dev/null
exit $CODE
