import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const outDir = path.resolve(process.cwd(), 'assets', 'pwa');
fs.mkdirSync(outDir, { recursive: true });

// Precompute CRC32 table for valid PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePngRgba(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // Filter type None
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq)) : 0;
  const cx = ax + t * vx;
  const cy = ay + t * vy;
  return Math.hypot(px - cx, py - cy);
}

function smoothAlpha(dist, halfWidth, feather) {
  if (dist <= halfWidth - feather) return 1;
  if (dist >= halfWidth + feather) return 0;
  return 1 - (dist - (halfWidth - feather)) / (2 * feather);
}

function blendColor(base, over, alpha) {
  const inv = 1 - alpha;
  return [
    base[0] * inv + over[0] * alpha,
    base[1] * inv + over[1] * alpha,
    base[2] * inv + over[2] * alpha,
  ];
}

function renderVelvetIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const feather = Math.max(0.8, size * 0.006);

  // Geometric V monogram normalized coordinates
  const leftTop = [size * 0.28, size * 0.27];
  const midBot = [size * 0.5, size * 0.69];
  const rightTop = [size * 0.72, size * 0.27];
  const strokeHalf = size * 0.058;

  // Accent emerald pill/dot above right wing / under V vertex
  const dotCenter = [size * 0.5, size * 0.81];
  const dotRadius = size * 0.036;

  // Subtle circular metallic bezel
  const ringCenter = size * 0.5;
  const ringRadius = size * 0.415;
  const ringHalf = Math.max(1, size * 0.0045);

  for (let y = 0; y < size; y += 1) {
    const ny = y / (size - 1);
    for (let x = 0; x < size; x += 1) {
      const nx = x / (size - 1);
      const radial = Math.hypot(nx - 0.35, ny - 0.22);
      const glow = Math.max(0, 1 - radial * 1.15);

      // Rich Obsidian Velvet base gradient (#101218 -> #1F2433 highlight)
      let rgb = [
        11 + ny * 4 + glow * 22,
        12 + ny * 4 + glow * 25,
        17 + ny * 6 + glow * 35,
      ];

      // Subtle violet-emerald ambient top corner glow matching Obsidian card
      const emeraldGlow = Math.max(0, 1 - Math.hypot(nx - 0.72, ny - 0.78) * 1.35);
      rgb = blendColor(rgb, [34, 197, 94], emeraldGlow * 0.12);

      // Hairline metallic frame circle
      const ringDist = Math.abs(Math.hypot(x - ringCenter, y - ringCenter) - ringRadius);
      const ringAlpha = smoothAlpha(ringDist, ringHalf, feather) * 0.16;
      if (ringAlpha > 0) {
        rgb = blendColor(rgb, [245, 247, 250], ringAlpha);
      }

      // Crisp Velvet "V" monogram
      const dLeft = distToSegment(
        x,
        y,
        leftTop[0],
        leftTop[1],
        midBot[0],
        midBot[1]
      );
      const dRight = distToSegment(
        x,
        y,
        midBot[0],
        midBot[1],
        rightTop[0],
        rightTop[1]
      );
      const vDist = Math.min(dLeft, dRight);
      const vAlpha = smoothAlpha(vDist, strokeHalf, feather);
      if (vAlpha > 0) {
        // Soft metallic top-to-bottom shading on V
        const letterColor = blendColor([255, 255, 255], [220, 226, 236], ny * 0.35);
        rgb = blendColor(rgb, letterColor, vAlpha);
      }

      // Emerald signature spark below the V
      const dotDist = Math.hypot(x - dotCenter[0], y - dotCenter[1]);
      const dotAlpha = smoothAlpha(dotDist, dotRadius, feather);
      if (dotAlpha > 0) {
        rgb = blendColor(rgb, [34, 197, 94], dotAlpha);
      }

      const idx = (y * size + x) * 4;
      buf[idx] = Math.max(0, Math.min(255, Math.round(rgb[0])));
      buf[idx + 1] = Math.max(0, Math.min(255, Math.round(rgb[1])));
      buf[idx + 2] = Math.max(0, Math.min(255, Math.round(rgb[2])));
      buf[idx + 3] = 255;
    }
  }

  return encodePngRgba(size, size, buf);
}

const targets = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

for (const target of targets) {
  const png = renderVelvetIcon(target.size);
  const filePath = path.join(outDir, target.name);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${path.relative(process.cwd(), filePath)} (${target.size}x${target.size}, ${png.length} bytes)`);
}
