// Procedurally generates the PWA app icons using Node's built-in canvas
// (via the canvas lib) or, if unavailable, via pure PNG byte synthesis.
//
// To keep dev-deps minimal, this script generates 512x512 and 192x192 icons
// by drawing a stylised tombstone/top-hat scene directly onto a raw RGBA
// buffer and encoding it to PNG with zero external packages.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/icons");
fs.mkdirSync(OUT, { recursive: true });

// ---------- Minimal PNG encoder ----------
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // colour type: RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  // Filter byte 0 per scanline, then rgba bytes
  const rowLength = width * 4;
  const raw = Buffer.alloc((rowLength + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowLength + 1)] = 0;
    rgba.copy(raw, y * (rowLength + 1) + 1, y * rowLength, (y + 1) * rowLength);
  }
  const idatData = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- Drawing helpers ----------
function makeBuf(w, h) { return Buffer.alloc(w * h * 4); }
function setPixel(buf, w, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= w || y >= buf.length / 4 / w) return;
  const o = (y * w + x) * 4;
  buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = a;
}
function fillRect(buf, w, x, y, rw, rh, color) {
  for (let dy = 0; dy < rh; dy++)
    for (let dx = 0; dx < rw; dx++)
      setPixel(buf, w, x + dx, y + dy, color);
}
function hexToRgba(hex, a = 255) {
  const n = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return [r, g, b, a];
}

// Render a 32x32 icon scene then upscale to any size with nearest-neighbor.
function renderIcon32(maskable) {
  const W = 32, H = 32;
  const buf = makeBuf(W, H);

  const bg = hexToRgba(maskable ? "#1a1726" : "#120f1a");
  const bgMid = hexToRgba(maskable ? "#2a2440" : "#241f35");
  const moonClr = hexToRgba("#f1eacb");
  const grassDk = hexToRgba("#1f3626");
  const grassLt = hexToRgba("#2e4d36");
  const tombMain = hexToRgba("#a8a29b");
  const tombHi = hexToRgba("#d8d3c7");
  const tombLo = hexToRgba("#5b564d");
  const hatMain = hexToRgba("#0a0a12");
  const hatBand = hexToRgba("#5a1a20");
  const rose = hexToRgba("#c83a52");

  // Sky gradient (two bands)
  fillRect(buf, W, 0, 0, W, 18, bg);
  fillRect(buf, W, 0, 16, W, 4, bgMid);

  // Moon (simple circle)
  for (let y = 3; y < 11; y++) {
    for (let x = 21; x < 29; x++) {
      const dx = x - 25, dy = y - 7;
      if (dx * dx + dy * dy <= 13) setPixel(buf, W, x, y, moonClr);
    }
  }
  // moon crescent shadow
  for (let y = 4; y < 10; y++) {
    for (let x = 24; x < 28; x++) {
      const dx = x - 27, dy = y - 7;
      if (dx * dx + dy * dy <= 8) setPixel(buf, W, x, y, bg);
    }
  }

  // Ground
  fillRect(buf, W, 0, 20, W, 12, grassDk);
  for (let x = 0; x < W; x += 2) setPixel(buf, W, x, 20, grassLt);
  for (let x = 1; x < W; x += 3) setPixel(buf, W, x, 22, grassLt);

  // Central tombstone
  const tx = 11, ty = 11;
  // cross-topped arch: cap curves
  fillRect(buf, W, tx, ty + 2, 10, 14, tombMain);
  fillRect(buf, W, tx + 1, ty + 1, 8, 1, tombMain);
  fillRect(buf, W, tx + 2, ty, 6, 1, tombMain);
  // highlight strip
  fillRect(buf, W, tx, ty + 2, 1, 12, tombHi);
  fillRect(buf, W, tx + 1, ty + 1, 1, 1, tombHi);
  fillRect(buf, W, tx + 2, ty, 1, 1, tombHi);
  // shadow edge
  fillRect(buf, W, tx + 9, ty + 2, 1, 14, tombLo);
  fillRect(buf, W, tx + 8, ty + 1, 1, 1, tombLo);
  fillRect(buf, W, tx + 7, ty, 1, 1, tombLo);
  // "RIP" ish dot detail
  fillRect(buf, W, tx + 4, ty + 5, 3, 1, tombLo);
  fillRect(buf, W, tx + 4, ty + 7, 3, 1, tombLo);

  // Top hat sitting on the tomb (subtle)
  fillRect(buf, W, tx + 2, ty - 3, 6, 1, hatMain);
  fillRect(buf, W, tx + 1, ty - 2, 8, 1, hatMain);
  fillRect(buf, W, tx + 2, ty - 1, 6, 1, hatBand);

  // Rose at base
  setPixel(buf, W, tx + 5, ty + 15, rose);
  setPixel(buf, W, tx + 4, ty + 16, rose);
  setPixel(buf, W, tx + 6, ty + 16, rose);
  setPixel(buf, W, tx + 5, ty + 17, rose);
  setPixel(buf, W, tx + 6, ty + 17, hexToRgba("#20613a"));

  return { buf, w: W, h: H };
}

function upscale(small, scale) {
  const w = small.w * scale;
  const h = small.h * scale;
  const out = makeBuf(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / scale);
      const sy = Math.floor(y / scale);
      const o = (sy * small.w + sx) * 4;
      const d = (y * w + x) * 4;
      out[d] = small.buf[o];
      out[d + 1] = small.buf[o + 1];
      out[d + 2] = small.buf[o + 2];
      out[d + 3] = small.buf[o + 3];
    }
  }
  return { buf: out, w, h };
}

function writeIcon(name, img) {
  const png = encodePng(img.w, img.h, img.buf);
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`wrote ${name} (${img.w}x${img.h}, ${png.length} B)`);
}

const base = renderIcon32(false);
writeIcon("icon-192.png", upscale(base, 6)); // 192
writeIcon("icon-512.png", upscale(base, 16)); // 512

const maskable = renderIcon32(true);
writeIcon("icon-maskable-512.png", upscale(maskable, 16));

// Favicon (32x32 passthrough)
writeIcon("icon-32.png", base);
