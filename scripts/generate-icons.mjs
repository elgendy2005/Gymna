// Builds the app icons and favicon from the logo artwork
// (gymna-personal-trainer.png in the repo root). Run once, and again only if
// the logo changes:
//
//   node scripts/generate-icons.mjs
//
// The outputs are committed, so a normal install or build never needs this.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "gymna-personal-trainer.png");
const OUT = path.join(ROOT, "public", "icons");
const FAVICON = path.join(ROOT, "src", "app", "favicon.ico");

// The "G" mark only: the wordmark and tagline are unreadable at icon sizes.
const CROP = { left: 287, top: 132, width: 640, height: 640 };

// The artwork sits on a faint gradient; flatten it to one dark colour so the
// padding around the mark has no visible seam. Matches dark `--background`.
const BG = { r: 4, g: 15, b: 22, alpha: 1 };
const { data, info } = await sharp(SOURCE)
  .extract(CROP)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 3) {
  if (Math.max(data[i], data[i + 1], data[i + 2]) < 48) {
    data[i] = BG.r;
    data[i + 1] = BG.g;
    data[i + 2] = BG.b;
  }
}
const mark = await sharp(data, { raw: info }).png().toBuffer();

/** The mark scaled to `scale` of `size`, centred on the artwork background. */
async function render(size, scale) {
  const inner = Math.round(size * scale);
  const pad = size - inner;
  const before = Math.floor(pad / 2);
  return sharp(mark)
    .resize(inner, inner)
    .extend({ top: before, left: before, bottom: pad - before, right: pad - before, background: BG })
    // ICO decoders (Next.js's included) only accept RGBA PNGs.
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const icons = [
  { file: "icon-192.png", size: 192, scale: 0.92 },
  { file: "icon-512.png", size: 512, scale: 0.92 },
  // Maskable icons keep the mark inside the middle 80% every launcher shows.
  { file: "icon-maskable-512.png", size: 512, scale: 0.74 },
  // iOS adds its own rounding.
  { file: "apple-touch-icon.png", size: 180, scale: 0.86 },
];

await mkdir(OUT, { recursive: true });
for (const { file, size, scale } of icons) {
  await writeFile(path.join(OUT, file), await render(size, scale));
  console.log(`public/icons/${file}`);
}

// favicon.ico holding PNG images, which every current browser accepts.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => render(s, 1)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
await writeFile(FAVICON, Buffer.concat([header, ...images]));
console.log("src/app/favicon.ico");
