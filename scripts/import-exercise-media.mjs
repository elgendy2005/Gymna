// Converts the free-exercise-db photos to WebP and writes them to
// public/exercise-media/<exercise id>/<frame>.webp.
//
// Usage:
//   node scripts/import-exercise-media.mjs <path to a free-exercise-db checkout>
//
// The dataset (https://github.com/yuhonas/free-exercise-db, Unlicense) is
// only needed for this one-off conversion. Its output is committed, so the
// app never fetches third-party media at runtime.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 600;
const QUALITY = 68;
const CONCURRENCY = 8;

const source = process.argv[2];
if (!source) {
  console.error("Pass the path to a free-exercise-db checkout.");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "exercise-media");
const exercises = JSON.parse(
  await fs.readFile(path.join(root, "prisma/seed/data/free-exercise-db.json"), "utf8"),
);

const jobs = exercises.flatMap((exercise) =>
  exercise.images.map((image, frame) => ({
    from: path.join(source, "exercises", image),
    to: path.join(outDir, exercise.id, `${frame}.webp`),
  })),
);

let done = 0;
let skipped = 0;
const failed = [];

async function convert({ from, to }) {
  try {
    await fs.access(to);
    skipped += 1;
    return;
  } catch {
    // Not converted yet.
  }
  try {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await sharp(from)
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(to);
    done += 1;
  } catch (error) {
    failed.push(`${from}: ${error.message}`);
  }
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let job = queue.pop(); job; job = queue.pop()) await convert(job);
  }),
);

console.log(`converted ${done}, already present ${skipped}, failed ${failed.length}`);
if (failed.length) {
  console.error(failed.slice(0, 20).join("\n"));
  process.exit(1);
}
