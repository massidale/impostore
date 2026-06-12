#!/usr/bin/env bash
#
# Starts the Expo dev server and opens the HOST in a phone-sized,
# chromeless Chrome window with its own profile (slot 0, top-left).
# Guests are opened next to it via `npm run dev:multi -- <ROOM_ID>`.
#
# Overrides via env:
#   BASE_URL=http://localhost:8081  dev server URL
#   WIN_W=390 WIN_H=800             window size (px)

set -euo pipefail

cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:8081}"
WIN_W="${WIN_W:-390}"
WIN_H="${WIN_H:-800}"

profile="${TMPDIR:-/tmp}/gameshub-dev-host"
mkdir -p "$profile"

# Wait for the dev server in the background, then open the host window.
(
  until curl -s -o /dev/null --max-time 2 "$BASE_URL"; do sleep 1; done
  echo "[dev-host] Server pronto — apro la finestra host ($WIN_W x $WIN_H)"
  open -na "Google Chrome" --args \
    --user-data-dir="$profile" \
    --no-first-run --no-default-browser-check \
    --window-size="$WIN_W,$WIN_H" \
    --window-position="0,60" \
    --app="$BASE_URL"
) &

# Foreground: the Expo dev server, with its interactive keyboard intact.
# (No --web: that flag would open an extra tab in the default browser.)
exec npx expo start
