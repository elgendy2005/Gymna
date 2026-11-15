// Draws the app icons from the logo mark (see src/components/shared/logo.tsx)
// into public/icons. Run once, and again only if the mark or colours change:
//
//   node scripts/generate-icons.mjs
//
// The PNGs are committed, so a normal install or build never needs this.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// sRGB values of the `--brand` and `--primary-foreground` tokens in globals.css.
const BRAND = "#b8f641";
const MARK = "#111905";

/** The dumbbell mark on a 32-unit grid, the same shapes as the logo. */
const mark = `
  <rect x="5" y="11" width="4" height="10" rx="1.5" />
  <rect x="23" y="11" width="4" height="10" rx="1.5" />
  <rect x="10" y="8" width="3.5" height="16" rx="1.5" />
  <rect x="18.5" y="8" width="3.5" height="16" rx="1.5" />
  <rect x="13" y="14.5" width="6" height="3" />`;

/**
 * `radius` rounds the tile (0 fills the whole square). `scale` shrinks the
 * mark around the centre: maskable icons keep it inside the middle 80%, the
 * area every launcher shape is guaranteed to show.
 */
function svg({ radius, scale }) {
  const offset = (32 - 32 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${radius}" fill="${BRAND}" />
  <g fill="${MARK}" transform="translate(${offset} ${offset}) scale(${scale})">${mark}
  </g>
</svg>`;
}

const icons = [
  { file: "icon-192.png", size: 192, radius: 9, scale: 1 },
  { file: "icon-512.png", size: 512, radius: 9, scale: 1 },
  { file: "icon-maskable-512.png", size: 512, radius: 0, scale: 0.72 },
  // iOS adds its own rounding and shows transparency as black.
  { file: "apple-touch-icon.png", size: 180, radius: 0, scale: 0.86 },
];

await mkdir(OUT, { recursive: true });
for (const { file, size, ...shape } of icons) {
  await sharp(Buffer.from(svg(shape)), { density: (72 * size) / 32 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, file));
  console.log(`public/icons/${file}`);
}
