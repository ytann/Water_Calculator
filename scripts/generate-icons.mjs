#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

const PAL = {
  0: [0,0,0,0],
  1: [91,158,196,255],
  2: [21,101,160,255],
  3: [33,150,243,255],
};

const BOTTLE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0],
  [0,0,0,0,1,1,3,3,3,3,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,3,3,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

function makePNG(w, h) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    row[0] = 0;
    for (let x = 0; x < w; x++) {
      const sx = Math.floor((x / w) * 16);
      const sy = Math.floor((y / h) * 28);
      const cell = (BOTTLE[sy] && BOTTLE[sy][sx]) ? BOTTLE[sy][sx] : 0;
      const [r, g, b, a] = PAL[cell];
      const off = 1 + x * 4;
      row[off] = r; row[off + 1] = g; row[off + 2] = b; row[off + 3] = a;
    }
    rows.push(row);
  }
  return buildPNG(w, h, deflateSync(Buffer.concat(rows)));
}

function buildPNG(w, h, idat) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function chunk(type, data) {
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  return Buffer.concat([lb, tb, data, crc32b(Buffer.concat([tb, data]))]);
}

function crc32b(data) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) { c ^= data[i]; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0); }
  c = (c ^ 0xFFFFFFFF) >>> 0;
  return Buffer.from([c>>>24&255, c>>16&255, c>>8&255, c&255]);
}

for (const size of [16, 48, 128]) {
  const png = makePNG(size, size);
  writeFileSync(`icon-${size}.png`, png);
  console.log(`icon-${size}.png (${png.length} bytes)`);
}
