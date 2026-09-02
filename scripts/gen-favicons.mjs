import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve("public/icons/icon-512.png");
const APP = resolve("app");

// PNG sizes Google + browsers want. 48 multiples for Google's favicon crawler.
const png = (size) =>
  sharp(SRC).resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();

// Minimal ICO writer — embeds PNG blobs (valid since Vista, supported by Google).
function buildIco(entries) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); // reserved
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 0);
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1);
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bpp
    dir.writeUInt32LE(e.data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.data.length;
  });
  return Buffer.concat([head, dir, ...entries.map((e) => e.data)]);
}

const [i16, i32, i48, i96, apple] = await Promise.all([
  png(16), png(32), png(48), png(96), png(180),
]);

writeFileSync(resolve(APP, "favicon.ico"), buildIco([
  { size: 16, data: i16 },
  { size: 32, data: i32 },
  { size: 48, data: i48 },
]));
writeFileSync(resolve(APP, "icon.png"), i96);
writeFileSync(resolve(APP, "apple-icon.png"), apple);

console.log("wrote app/favicon.ico (16/32/48), app/icon.png (96), app/apple-icon.png (180)");
