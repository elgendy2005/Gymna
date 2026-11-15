// Seeds the exercise library. Safe to run again: exercises are matched by
// slug and updated in place, so their ids (and anything pointing at them)
// survive a re-seed.
//
//   npm run db:seed

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import {
  buildExercises,
  MEDIA_PROVIDER,
  type RawExercise,
  type SeedExercise,
} from "./build";
import dataset from "./data/free-exercise-db.json";

const CONCURRENCY = 8;
const ATTEMPTS = 3;

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const exercises = buildExercises(dataset as unknown as RawExercise[]);
  const queue = [...exercises];
  let done = 0;

  async function write(next: SeedExercise) {
    const { frames, ...data } = next;
    const exercise = await db.exercise.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
      select: { id: true },
    });

    const key = { exerciseId: exercise.id, provider: MEDIA_PROVIDER };
    if (frames.length > 0) {
      const media = { kind: "FRAME_SEQUENCE" as const, urls: frames, priority: 0 };
      await db.exerciseMedia.upsert({
        where: { exerciseId_provider: key },
        create: { ...key, ...media },
        update: media,
      });
    } else {
      await db.exerciseMedia.deleteMany({ where: key });
    }
  }

  async function worker() {
    for (let next = queue.pop(); next; next = queue.pop()) {
      // A hosted database drops the odd connection; every write is an
      // upsert, so trying again is safe.
      for (let attempt = 1; ; attempt += 1) {
        try {
          await write(next);
          break;
        } catch (error) {
          if (attempt === ATTEMPTS) throw error;
          console.warn(`  retrying ${next.slug} (attempt ${attempt + 1})`);
        }
      }

      done += 1;
      if (done % 100 === 0) console.log(`  ${done} / ${exercises.length}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const curated = exercises.filter((exercise) => exercise.engineEligible).length;
  console.log(`Seeded ${exercises.length} exercises (${curated} curated).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
