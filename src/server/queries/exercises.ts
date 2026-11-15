import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type {
  ExerciseCategory,
  ExerciseEquipment,
  MediaKind,
  MovementPattern,
  Muscle,
} from "@/lib/exercise-options";
import type { ExerciseSummary } from "@/lib/exercise-search";
import type { Level } from "@/lib/profile-options";
import { db } from "@/server/db";

// The library is the same for every user and only changes when the seed
// runs, so both reads are cached. Callers still check the session first.

/** Every exercise, curated ones first, then by English name. */
export async function getExerciseIndex(): Promise<ExerciseSummary[]> {
  "use cache";
  cacheLife("days");
  cacheTag("exercises");

  const rows = await db.exercise.findMany({
    orderBy: [{ engineEligible: "desc" }, { nameEn: "asc" }],
    select: {
      slug: true,
      nameEn: true,
      nameAr: true,
      equipment: true,
      difficulty: true,
      primaryMuscles: true,
      engineEligible: true,
      media: { orderBy: { priority: "desc" }, select: { kind: true, urls: true } },
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    equipment: row.equipment,
    difficulty: row.difficulty,
    primaryMuscles: row.primaryMuscles as Muscle[],
    curated: row.engineEligible,
    thumb:
      row.media.find((media) => media.kind === "FRAME_SEQUENCE")?.urls[0] ?? null,
  }));
}

export type ExerciseMediaItem = { kind: MediaKind; urls: string[] };

export type ExerciseDetail = {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  difficulty: Level;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  isCompound: boolean;
  movementPattern: MovementPattern | null;
  contraindications: string[];
  requirements: string[];
  curated: boolean;
  instructionsEn: string[];
  instructionsAr: string[];
  mistakesEn: string[];
  mistakesAr: string[];
  breathingEn: string | null;
  breathingAr: string | null;
  /** Best demo first. */
  media: ExerciseMediaItem[];
};

export async function getExercise(slug: string): Promise<ExerciseDetail | null> {
  "use cache";
  cacheLife("days");
  cacheTag("exercises");

  const row = await db.exercise.findUnique({
    where: { slug },
    include: {
      media: { orderBy: { priority: "desc" }, select: { kind: true, urls: true } },
    },
  });
  if (!row) return null;

  return {
    slug: row.slug,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    category: row.category,
    equipment: row.equipment,
    difficulty: row.difficulty,
    primaryMuscles: row.primaryMuscles as Muscle[],
    secondaryMuscles: row.secondaryMuscles as Muscle[],
    isCompound: row.isCompound,
    movementPattern: row.movementPattern as MovementPattern | null,
    contraindications: row.contraindications,
    requirements: row.requirements,
    curated: row.engineEligible,
    instructionsEn: row.instructionsEn,
    instructionsAr: row.instructionsAr,
    mistakesEn: row.mistakesEn,
    mistakesAr: row.mistakesAr,
    breathingEn: row.breathingEn,
    breathingAr: row.breathingAr,
    media: row.media,
  };
}

/** What the program engine needs to know about one curated exercise. */
export type EngineExerciseRow = {
  id: string;
  slug: string;
  equipment: ExerciseEquipment;
  difficulty: Level;
  isCompound: boolean;
  movementPattern: MovementPattern | null;
  primaryMuscles: Muscle[];
  contraindications: string[];
  requirements: string[];
};

/** The curated set the program engine builds plans from. */
export async function getEngineExercises(): Promise<EngineExerciseRow[]> {
  "use cache";
  cacheLife("days");
  cacheTag("exercises");

  const rows = await db.exercise.findMany({
    where: { engineEligible: true },
    // A fixed order, so the same answers always meet the same list.
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      equipment: true,
      difficulty: true,
      isCompound: true,
      movementPattern: true,
      primaryMuscles: true,
      contraindications: true,
      requirements: true,
    },
  });

  return rows.map((row) => ({
    ...row,
    movementPattern: row.movementPattern as MovementPattern | null,
    primaryMuscles: row.primaryMuscles as Muscle[],
  }));
}
