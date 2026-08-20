// app/icon.svg → app/favicon.ico (16·32·48px PNG 임베드).
// 다크/라이트 SERP 어디서나 보이게 배경 타일 있는 파비콘. sharp만 사용.
// 실행: node scripts/make-favicon.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(dir, '..', 'app', 'icon.svg'));
const sizes = [16, 32, 48];

const pngs = await Promise.all(
  sizes.map((s) => sharp(svg, { density: 384 }).resize(s, s).png().toBuffer())
);

// ICO 컨테이너 직접 작성 (PNG 임베드 방식).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type=icon
header.writeUInt16LE(sizes.length, 4); // count

const entries = [];
let offset = 6 + 16 * sizes.length;
for (let i = 0; i < sizes.length; i++) {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 0); // width
  e.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bpp
  e.writeUInt32LE(pngs[i].length, 8); // size
  e.writeUInt32LE(offset, 12); // offset
  offset += pngs[i].length;
  entries.push(e);
}

const ico = Buffer.concat([header, ...entries, ...pngs]);
writeFileSync(join(dir, '..', 'app', 'favicon.ico'), ico);
console.log(`favicon.ico 생성: ${sizes.join('·')}px, ${ico.length} bytes`);
