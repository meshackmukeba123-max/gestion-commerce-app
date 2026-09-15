// Génère public/icons/icon-192.png et icon-512.png sans dépendance externe
// (encodeur PNG minimal maison + rasterisation manuelle du logo).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Sanity check contre le vecteur de test standard CRC32("123456789") = 0xCBF43926
const check = crc32(Buffer.from("123456789"));
if (check !== 0xcbf43926) {
  throw new Error("CRC32 implementation incorrecte: " + check.toString(16));
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk("IHDR", ihdrData);

  // Chaque scanline précédée d'un octet de filtre (0 = aucun filtre)
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });
  const idat = chunk("IDAT", idatData);

  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// --- Rasterisation du logo (fond + 3 barres + 3 points + ligne de tendance) ---

function setPixel(buf, size, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

function fillRect(buf, size, x0, y0, w, h, color) {
  for (let y = Math.max(0, y0); y < Math.min(size, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(size, x0 + w); x++) {
      setPixel(buf, size, x, y, color[0], color[1], color[2], 255);
    }
  }
}

function fillCircle(buf, size, cx, cy, r, color) {
  for (let y = Math.max(0, cy - r); y <= Math.min(size - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(size - 1, cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(buf, size, x, y, color[0], color[1], color[2], 255);
    }
  }
}

function strokeLine(buf, size, x1, y1, x2, y2, thickness, color) {
  const minX = Math.max(0, Math.min(x1, x2) - thickness);
  const maxX = Math.min(size - 1, Math.max(x1, x2) + thickness);
  const minY = Math.max(0, Math.min(y1, y2) - thickness);
  const maxY = Math.min(size - 1, Math.max(y1, y2) + thickness);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const ddx = x - px;
      const ddy = y - py;
      if (ddx * ddx + ddy * ddy <= thickness * thickness) {
        setPixel(buf, size, x, y, color[0], color[1], color[2], 255);
      }
    }
  }
}

function buildIconBuffer(size) {
  const buf = Buffer.alloc(size * size * 4);
  const emerald = [5, 150, 105]; // #059669
  const white = [255, 255, 255];

  fillRect(buf, size, 0, 0, size, size, emerald);

  const s = size / 512;
  fillRect(buf, size, Math.round(120 * s), Math.round(220 * s), Math.round(60 * s), Math.round(160 * s), white);
  fillRect(buf, size, Math.round(226 * s), Math.round(160 * s), Math.round(60 * s), Math.round(220 * s), white);
  fillRect(buf, size, Math.round(332 * s), Math.round(260 * s), Math.round(60 * s), Math.round(120 * s), white);

  fillCircle(buf, size, Math.round(150 * s), Math.round(190 * s), Math.round(20 * s), white);
  fillCircle(buf, size, Math.round(256 * s), Math.round(130 * s), Math.round(20 * s), white);
  fillCircle(buf, size, Math.round(362 * s), Math.round(230 * s), Math.round(20 * s), white);

  strokeLine(buf, size, Math.round(150 * s), Math.round(190 * s), Math.round(256 * s), Math.round(130 * s), Math.round(6 * s), white);
  strokeLine(buf, size, Math.round(256 * s), Math.round(130 * s), Math.round(362 * s), Math.round(230 * s), Math.round(6 * s), white);

  return buf;
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const buf = buildIconBuffer(size);
  const png = encodePng(size, size, buf);
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Écrit ${outPath} (${png.length} octets)`);
}
