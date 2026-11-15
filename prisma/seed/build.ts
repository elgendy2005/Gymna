// Turns the free-exercise-db snapshot plus the curated enrichment into the
// rows the seed script writes. Pure, so the unit tests can check the data
// without a database.

import {
  MUSCLES,
  type ExerciseCategory,
  type ExerciseEquipment,
  type MovementPattern,
  type Muscle,
} from "../../src/lib/exercise-options";
import type { Level } from "../../src/lib/profile-options";
import { CURATED_EXERCISES, type CuratedExercise } from "./enrichment/curated";
import { PATTERN_CONTENT } from "./enrichment/patterns";

/** One entry of free-exercise-db's exercises.json. */
export type RawExercise = {
  id: string;
  name: string;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

export type SeedExercise = {
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
  engineEligible: boolean;
  instructionsEn: string[];
  instructionsAr: string[];
  mistakesEn: string[];
  mistakesAr: string[];
  breathingEn: string | null;
  breathingAr: string | null;
  /** Demo frames, as paths under the media base URL. */
  frames: string[];
};

export const MEDIA_PROVIDER = "free-exercise-db";

const EQUIPMENT: Record<string, ExerciseEquipment> = {
  "body only": "BODYWEIGHT",
  dumbbell: "DUMBBELL",
  barbell: "BARBELL",
  "e-z curl bar": "EZ_BAR",
  kettlebells: "KETTLEBELL",
  cable: "CABLE",
  machine: "MACHINE",
  bands: "BANDS",
  "medicine ball": "MEDICINE_BALL",
  "exercise ball": "EXERCISE_BALL",
  "foam roll": "FOAM_ROLL",
  other: "OTHER",
};

const CATEGORY: Record<string, ExerciseCategory> = {
  strength: "STRENGTH",
  stretching: "STRETCHING",
  plyometrics: "PLYOMETRICS",
  cardio: "CARDIO",
  powerlifting: "POWERLIFTING",
  "olympic weightlifting": "OLYMPIC_WEIGHTLIFTING",
  strongman: "STRONGMAN",
};

const LEVEL: Record<string, Level> = {
  beginner: "BEGINNER",
  intermediate: "INTERMEDIATE",
  expert: "ADVANCED",
};

function lookup<T>(table: Record<string, T>, key: string, what: string, id: string): T {
  const value = table[key];
  if (value === undefined) throw new Error(`${id}: unknown ${what} "${key}"`);
  return value;
}

function toMuscles(names: string[], id: string): Muscle[] {
  return names.map((name) => {
    const muscle = name.replace(/ /g, "_");
    if (!(MUSCLES as readonly string[]).includes(muscle)) {
      throw new Error(`${id}: unknown muscle "${name}"`);
    }
    return muscle as Muscle;
  });
}

export function buildExercises(
  raw: RawExercise[],
  curated: CuratedExercise[] = CURATED_EXERCISES,
): SeedExercise[] {
  const curatedBySlug = new Map<string, CuratedExercise>();
  for (const entry of curated) {
    if (curatedBySlug.has(entry.slug)) {
      throw new Error(`curated: "${entry.slug}" is listed twice`);
    }
    curatedBySlug.set(entry.slug, entry);
  }

  const rows = raw.map((source): SeedExercise => {
    const steps = source.instructions.map((step) => step.trim()).filter(Boolean);
    const extra = curatedBySlug.get(source.id);
    const pattern = extra ? PATTERN_CONTENT[extra.pattern] : null;
    curatedBySlug.delete(source.id);

    return {
      slug: source.id,
      nameEn: source.name.trim(),
      nameAr: extra?.nameAr ?? null,
      category: lookup(CATEGORY, source.category, "category", source.id),
      // The dataset leaves equipment empty for moves that need none.
      equipment:
        extra?.equipment ??
        (source.equipment === null
          ? "BODYWEIGHT"
          : lookup(EQUIPMENT, source.equipment, "equipment", source.id)),
      difficulty: extra?.difficulty ?? lookup(LEVEL, source.level, "level", source.id),
      primaryMuscles: toMuscles(source.primaryMuscles, source.id),
      secondaryMuscles: toMuscles(source.secondaryMuscles, source.id),
      isCompound: source.mechanic === "compound",
      movementPattern: extra?.pattern ?? null,
      contraindications: [
        ...new Set([...(pattern?.avoid ?? []), ...(extra?.avoid ?? [])]),
      ].sort(),
      requirements: [...(extra?.requires ?? [])],
      engineEligible: extra !== undefined,
      instructionsEn: steps.length > 0 ? steps : (extra?.cuesEn ?? []),
      instructionsAr: extra?.cuesAr ?? [],
      mistakesEn: pattern?.mistakesEn ?? [],
      mistakesAr: pattern?.mistakesAr ?? [],
      breathingEn: pattern?.breathingEn ?? null,
      breathingAr: pattern?.breathingAr ?? null,
      frames: source.images.map((_, frame) => `${source.id}/${frame}.webp`),
    };
  });

  if (curatedBySlug.size > 0) {
    throw new Error(
      `curated: not in the dataset: ${[...curatedBySlug.keys()].join(", ")}`,
    );
  }
  return rows;
}
