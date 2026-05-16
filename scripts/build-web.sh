#!/usr/bin/env bash
#
# Builds the static web bundle into ./dist and injects PWA bits.
# Used by deploy-staging.sh and deploy-prod.sh. Run from anywhere.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "[build] Expo export (web)"
npx expo export --platform web

echo "[build] PWA icons"
sips -z 512 512 assets/icon-square.png --out dist/icon-512-v2.png > /dev/null
sips -z 192 192 assets/icon-square.png --out dist/icon-192-v2.png > /dev/null

echo "[build] manifest.json"
cat > dist/manifest.json <<'MANIFEST'
{
  "name": "gamesHub",
  "short_name": "gamesHub",
  "description": "Party game italiani multiplayer — gioca con gli amici",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0F1C",
  "theme_color": "#06B6D4",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192-v2.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512-v2.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
MANIFEST

echo "[build] Injecting PWA meta tags + safe-area styles"
sed -i '' 's/<head>/<head>\
    <link rel="manifest" href="\/manifest.json">\
    <meta name="apple-mobile-web-app-capable" content="yes">\
    <meta name="mobile-web-app-capable" content="yes">\
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\
    <meta name="apple-mobile-web-app-title" content="gamesHub">\
    <meta name="theme-color" content="#06B6D4">\
    <meta name="description" content="Party game italiani multiplayer — gioca con gli amici">\
    <link rel="apple-touch-icon" href="\/icon-192-v2.png">\
    <link rel="icon" type="image\/png" href="\/icon-192-v2.png">\
    <style>html, body, #root { background-color: #0A0F1C !important; box-sizing: border-box; height: 100dvh; max-height: 100dvh; overflow: hidden; } body { padding-top: env(safe-area-inset-top); }<\/style>/' dist/index.html

echo "[build] Done."
