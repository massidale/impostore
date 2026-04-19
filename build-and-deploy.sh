#!/bin/bash

echo "🔨 Building PWA..."
npx expo export --platform web

echo "📱 Creating PWA manifest and icons..."
# Usa icon-square.png (quadrata 1536x1536) e ridimensiona
sips -z 512 512 assets/icon-square.png --out dist/icon-512-v2.png
sips -z 192 192 assets/icon-square.png --out dist/icon-192-v2.png

# Crea il manifest.json per PWA
cat > dist/manifest.json << 'MANIFEST'
{
  "name": "Impostore",
  "short_name": "Impostore",
  "description": "Party game italiano multiplayer",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#111827",
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

echo "📱 Adding PWA meta tags and styles..."
# Inserisce i meta tag Apple, link al manifest e CSS per coprire la safe area
sed -i '' 's/<head>/<head>\
    <link rel="manifest" href="\/manifest.json">\
    <meta name="apple-mobile-web-app-capable" content="yes">\
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\
    <meta name="apple-mobile-web-app-title" content="Impostore">\
    <meta name="theme-color" content="#111827">\
    <link rel="apple-touch-icon" href="\/icon-192-v2.png">\
    <style>html, body, #root { background-color: #111827 !important; } body { padding-top: env(safe-area-inset-top); }<\/style>/' dist/index.html

echo "🚀 Deploying to Firebase..."
firebase deploy

echo "✅ Done!"
echo ""
echo "URLs:"
echo "  - App (host + player): https://impostore-c0ef1.web.app"
echo "  - Link player:         https://impostore-c0ef1.web.app?room=<ROOM_ID>"
