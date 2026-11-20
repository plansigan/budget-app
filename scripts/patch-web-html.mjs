import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');
const pwaIconsSrcDir = path.resolve(process.cwd(), 'assets', 'pwa');
const distIconsDir = path.join(distDir, 'icons');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing exported web HTML at ${indexPath}`);
}

const rawBaseUrl = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
const manifestHref = `${rawBaseUrl}/manifest.json`;
const appleTouchIconHref = `${rawBaseUrl}/icons/apple-touch-icon.png`;
const startUrl = rawBaseUrl ? `${rawBaseUrl}/` : '/';
const indexShellUrl = `${rawBaseUrl}/index.html`;

// Copy generated PWA icons into dist/icons/
const iconFiles = ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
fs.mkdirSync(distIconsDir, { recursive: true });
for (const fileName of iconFiles) {
  const srcFile = path.join(pwaIconsSrcDir, fileName);
  if (!fs.existsSync(srcFile)) {
    throw new Error(`Missing PWA icon ${srcFile}. Run node scripts/generate-pwa-icons.mjs first.`);
  }
  fs.copyFileSync(srcFile, path.join(distIconsDir, fileName));
}

let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(
  /<meta\s+name="viewport"\s+content="[^"]*"\s*\/?>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />'
);

const pwaHeadTags = [
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="Velvet Budget" />',
  `<link rel="apple-touch-icon" sizes="180x180" href="${appleTouchIconHref}" />`,
  `<link rel="manifest" href="${manifestHref}" />`,
  '<style id="velvet-web-base">input:focus,textarea:focus{outline:none !important;box-shadow:none !important;}@supports (-webkit-touch-callout: none){input,textarea,select{font-size:16px !important;}}</style>',
].join('\n    ');

if (!html.includes('id="velvet-web-base"')) {
  html = html.replace('</head>', `    ${pwaHeadTags}\n  </head>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(path.join(distDir, '404.html'), html, 'utf8');

const manifest = {
  name: 'Velvet Budget',
  short_name: 'Velvet',
  description: 'Minimalist personal budget & treat vault tracker',
  start_url: startUrl,
  scope: startUrl,
  display: 'standalone',
  theme_color: '#141519',
  background_color: '#0B0C10',
  icons: [
    {
      src: `${rawBaseUrl}/icons/icon-192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: `${rawBaseUrl}/icons/icon-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
  ],
};

fs.writeFileSync(
  path.join(distDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

// Build safe offline-capable Service Worker with build-unique cache key
function walkRelativeUrls(subDir) {
  const fullDir = path.join(distDir, subDir);
  if (!fs.existsSync(fullDir)) return [];
  const results = [];
  const stack = [fullDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && !entry.name.endsWith('.map')) {
        if (entry.name.endsWith('.ttf') && !entry.name.startsWith('Feather.')) {
          continue;
        }
        const rel = path.relative(distDir, fullPath).split(path.sep).join('/');
        results.push(`${rawBaseUrl}/${rel}`);
      }
    }
  }
  return results.sort();
}

const expoJsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
let bundleBuildId = `${Date.now()}`;
if (fs.existsSync(expoJsDir)) {
  const jsFiles = fs.readdirSync(expoJsDir).filter((f) => f.endsWith('.js')).sort();
  if (jsFiles.length > 0) {
    bundleBuildId = jsFiles[0].replace(/[^a-zA-Z0-9_-]/g, '-');
  }
}
const cacheName = `velvet-budget-${bundleBuildId}`;

const precacheUrls = Array.from(
  new Set([
    startUrl,
    indexShellUrl,
    manifestHref,
    ...walkRelativeUrls('_expo/static'),
    ...walkRelativeUrls('assets'),
    ...walkRelativeUrls('icons'),
  ])
);

const swSource = `// Auto-generated Service Worker for Velvet Budget PWA
const CACHE_NAME = ${JSON.stringify(cacheName)};
const CACHE_PREFIX = 'velvet-budget-';
const SCOPE_URL = ${JSON.stringify(startUrl)};
const APP_SHELL_URL = ${JSON.stringify(indexShellUrl)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML/navigation so new deployments appear seamlessly online
  if (
    request.mode === 'navigate' ||
    url.pathname === SCOPE_URL ||
    url.pathname === APP_SHELL_URL
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(APP_SHELL_URL) || caches.match(SCOPE_URL))
        )
    );
    return;
  }

  // Cache-first for hashed JS/CSS/font/icon assets
  const isStaticAsset =
    url.pathname.includes('/_expo/static/') ||
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.endsWith('/manifest.json');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
`;

fs.writeFileSync(path.join(distDir, 'sw.js'), swSource, 'utf8');

console.log(
  `Patched dist/index.html, 404.html, manifest.json, icons (${iconFiles.length}), and sw.js (${cacheName}, ${precacheUrls.length} cached assets, baseUrl="${rawBaseUrl}")`
);
