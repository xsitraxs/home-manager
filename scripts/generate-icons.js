// Скрипт генерации иконок приложения
// Запуск: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Минимальная PNG 256x256 — синяя капля воды на прозрачном фоне
function createPNG(size) {
  // Простой подход: создаём RGBA пиксели и оборачиваем в PNG
  const pixels = Buffer.alloc(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Капля воды — круг с заострением сверху
      const dropY = dy + r * 0.3;
      const dropDist = Math.sqrt(dx * dx + dropY * dropY);
      const isDrop = dropDist < r || (dy < -r * 0.3 && Math.abs(dx) < r * 0.3 * (1 + dy / (r * 0.8)));

      if (isDrop) {
        // Градиент: сверху светлее, снизу темнее
        const t = (y - (cy - r)) / (2 * r);
        pixels[idx] = Math.round(74 + t * 20);   // R
        pixels[idx + 1] = Math.round(144 + t * 30); // G
        pixels[idx + 2] = Math.round(217);          // B
        pixels[idx + 3] = 255;                       // A
      } else {
        pixels[idx + 3] = 0; // прозрачный
      }
    }
  }

  // Создаём минимальный PNG вручную
  return encodePNG(size, size, pixels);
}

// Минимальный PNG encoder
function encodePNG(width, height, rgba) {
  const zlib = require('zlib');

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT — raw image data с filter byte 0 перед каждой строкой
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw);

  // Сборка PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const chunk = Buffer.alloc(4 + 4 + data.length + 4);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4);
    data.copy(chunk, 8);
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    chunk.writeInt32BE(crc, 8 + data.length);
    return chunk;
  }

  // CRC32
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) | 0;
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Генерируем иконки
const resourcesDir = path.join(__dirname, '..', 'resources');
if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });

// PNG 256x256
const png256 = createPNG(256);
fs.writeFileSync(path.join(resourcesDir, 'icon.png'), png256);
console.log('✅ icon.png (256x256) создан');

// PNG 512x512 для high-res
const png512 = createPNG(512);
fs.writeFileSync(path.join(resourcesDir, 'icon@2x.png'), png512);
console.log('✅ icon@2x.png (512x512) создан');


// Windows ICO: ICO directory followed by the existing 256x256 PNG payload.
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // image type: icon
icoHeader.writeUInt16LE(1, 4); // image count
const icoEntry = Buffer.alloc(16);
icoEntry[0] = 0; // 256px is encoded as 0
icoEntry[1] = 0;
icoEntry[2] = 0;
icoEntry[3] = 0;
icoEntry.writeUInt16LE(1, 4); // color planes
icoEntry.writeUInt16LE(32, 6); // bits per pixel
icoEntry.writeUInt32LE(png256.length, 8);
icoEntry.writeUInt32LE(22, 12); // image starts after header and entry
fs.writeFileSync(path.join(resourcesDir, 'icon.ico'), Buffer.concat([icoHeader, icoEntry, png256]));
console.log('✅ icon.ico создан');

// macOS ICNS: ic08 is the standard 256x256 PNG image chunk.
const icnsChunk = Buffer.alloc(8);
icnsChunk.write('ic08', 0, 4, 'ascii');
icnsChunk.writeUInt32BE(png256.length + 8, 4);
const icnsHeader = Buffer.alloc(8);
icnsHeader.write('icns', 0, 4, 'ascii');
icnsHeader.writeUInt32BE(png256.length + 16, 4);
fs.writeFileSync(path.join(resourcesDir, 'icon.icns'), Buffer.concat([icnsHeader, icnsChunk, png256]));
console.log('✅ icon.icns создан');
