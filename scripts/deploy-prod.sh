#!/usr/bin/env bash
#
# Deploys to PRODUCTION (live Firebase channel) and pushes the current
# branch to GitHub. Order: tests -> build -> push -> deploy.
#
# Push happens BEFORE deploy on purpose: ensures the deployed code is
# already in git history. If push fails (need to rebase), deploy is
# skipped — re-run after fixing.
#
# Pre-flight:
#   - working tree must be clean (no uncommitted changes)
#   - warns if not on `main`
#   - typecheck + tests must pass
#   - explicit confirmation before deploying

set -euo pipefail

cd "$(dirname "$0")/.."

echo "[prod] Working-tree check"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "[prod] ERROR: working tree non pulita. Committa o stash prima di deployare." >&2
  git status --short
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  read -r -p "[prod] WARN: sei sul branch '$CURRENT_BRANCH', non 'main'. Procedere? [y/N] " ans
  [[ "${ans:-}" =~ ^[Yy]$ ]] || { echo "[prod] Abortito."; exit 1; }
fi

echo "[prod] Type-check"
npm run typecheck

echo "[prod] Tests"
npm test

echo "[prod] Build web bundle"
./scripts/build-web.sh

echo
read -r -p "[prod] Confermi il DEPLOY in PRODUZIONE su Firebase (hosting + database rules)? [y/N] " confirm
[[ "${confirm:-}" =~ ^[Yy]$ ]] || { echo "[prod] Abortito."; exit 1; }

echo "[prod] git push origin $CURRENT_BRANCH"
git push origin "$CURRENT_BRANCH"

echo "[prod] firebase deploy --only hosting,database"
firebase deploy --only hosting,database

echo
echo "[prod] Done."
echo "  URL:   https://gameshub-6b1ce.web.app"
echo "  Player: https://gameshub-6b1ce.web.app?room=<ROOM_ID>"
