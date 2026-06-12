#!/usr/bin/env bash
#
# Opens N guest players against a local dev room, each in its own
# phone-sized chromeless Chrome window with an isolated identity.
#
# Usage:
#   npm run dev:multi -- <ROOM_ID> [N_GUESTS]
#   ./scripts/dev-multi.sh ABC123 4
#
# Prerequisites: `npm run web` already running, room created from the
# host browser. Each window:
#   - uses its own Chrome profile (separate process + storage)
#   - adds `cid=pN` (per-tab identity, belt & braces)
#   - adds `name=GiocatoreN` → joins the room automatically
#
# Overrides via env:
#   BASE_URL=http://localhost:8081  dev server URL
#   WIN_W=390 WIN_H=800             window size (px)
#   NAME_PREFIX=Giocatore           player name prefix

set -euo pipefail

ROOM="${1:?Uso: dev-multi.sh <ROOM_ID> [N_GUESTS]}"
GUESTS="${2:-4}"
BASE_URL="${BASE_URL:-http://localhost:8081}"
WIN_W="${WIN_W:-390}"
WIN_H="${WIN_H:-800}"
NAME_PREFIX="${NAME_PREFIX:-Giocatore}"

ROOM_UPPER="$(printf '%s' "$ROOM" | tr '[:lower:]' '[:upper:]')"
if [[ ! "$ROOM_UPPER" =~ ^[A-Z0-9]{6}$ ]]; then
  echo "[dev-multi] ERROR: room id non valido: '$ROOM'" >&2
  exit 1
fi

if ! curl -s -o /dev/null --max-time 2 "$BASE_URL"; then
  echo "[dev-multi] ERROR: dev server non raggiungibile su $BASE_URL." >&2
  echo "            Avvia prima 'npm run web'." >&2
  exit 1
fi

echo "[dev-multi] Stanza $ROOM_UPPER — apro $GUESTS guest ($WIN_W x $WIN_H)"

for ((i = 1; i <= GUESTS; i++)); do
  n=$((i + 1)) # host is player 1
  profile="${TMPDIR:-/tmp}/gameshub-dev-p$n"
  mkdir -p "$profile"
  url="$BASE_URL/?room=$ROOM_UPPER&cid=p$n&name=$NAME_PREFIX$n"
  # Slot 0 is reserved for the host window opened by dev-host.sh.
  x=$(( i * (WIN_W + 14) ))

  echo "[dev-multi]  → $NAME_PREFIX$n ($url)"
  open -na "Google Chrome" --args \
    --user-data-dir="$profile" \
    --no-first-run --no-default-browser-check \
    --window-size="$WIN_W,$WIN_H" \
    --window-position="$x,60" \
    --app="$url"
done

echo
echo "[dev-multi] Fatto. I guest entrano in stanza da soli."
echo "[dev-multi] Per ripulire le identità di test:"
echo "  rm -rf ${TMPDIR:-/tmp}/gameshub-dev-p*"
