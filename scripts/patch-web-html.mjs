import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing exported web HTML at ${indexPath}`);
}

const rawBaseUrl = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
const manifestHref = `${rawBaseUrl}/manifest.json`;
const startUrl = rawBaseUrl ? `${rawBaseUrl}/` : '/';

let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(
  /<meta\s+name="viewport"\s+content="[^"]*"\s*\/?>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
);

const pwaHeadTags = [
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="Velvet Budget" />',
  `<link rel="manifest" href="${manifestHref}" />`,
  '<style id="velvet-web-base">input:focus,textarea:focus{outline:none !important;box-shadow:none !important;}</style>',
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
};

fs.writeFileSync(
  path.join(distDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8',
);

console.log(`Patched dist/index.html, 404.html, and manifest.json (baseUrl="${rawBaseUrl}")`);
