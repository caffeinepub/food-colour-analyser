# Food Colour Analyser

## Current State
A full-stack food colour analysis web app with:
- CIE L*a*b*, Chroma, and Whiteness Index extraction from uploaded food images
- Comparison mode between two images (RGB/HEX, HSL/HSV, CIELAB differences)
- PDF export including the original image + L*, a*, b* channel visualisation maps
- Excel export of results
- React + Vite frontend; already has basic mobile meta tags (apple-mobile-web-app-capable, theme-color) but NO web manifest, NO service worker, NO install prompt

## Requested Changes (Diff)

### Add
- `public/manifest.webmanifest` -- full PWA web app manifest with name, short_name, icons, display, start_url, theme_color, background_color, orientation, categories
- `public/sw.js` -- service worker that caches the app shell (HTML, JS, CSS, assets) for offline use; uses a cache-first strategy for static assets
- PWA icon set: 192x192 and 512x512 PNG icons (generated) placed in `public/icons/`
- `<link rel="manifest">` tag in `index.html`
- In-app "Install App" banner/button component that listens for the `beforeinstallprompt` event and lets users install to their Android home screen
- `vite-plugin-pwa` OR manual service worker registration in `main.tsx` (manual approach preferred since vite-plugin-pwa is not in package.json)

### Modify
- `index.html` -- add `<link rel="manifest" href="/manifest.webmanifest">` and a maskable-icon apple-touch-icon link
- `src/main.tsx` -- register the service worker after React mounts

### Remove
- Nothing

## Implementation Plan
1. Generate 192x192 and 512x512 app icons
2. Write `public/manifest.webmanifest` referencing those icons
3. Write `public/sw.js` with cache-first strategy for static assets
4. Update `index.html` to link the manifest and apple-touch-icon
5. Update `main.tsx` to register `/sw.js` via `navigator.serviceWorker.register`
6. Add `InstallBanner` component that captures `beforeinstallprompt` and shows an unobtrusive install button (dismissed via localStorage flag)
7. Mount `InstallBanner` in `App.tsx`
8. Validate (typecheck + build)
