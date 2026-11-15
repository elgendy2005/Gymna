import {
  EQUIPMENT_ACCESS,
  FOCUS_AREA_MUSCLES,
  REQUIREMENTS,
  type ExerciseEquipment,
  type MovementPattern,
  type Muscle,
} from "@/lib/exercise-options";
import type { Equipment, Level } from "@/lib/profile-options";
import type { EngineExercise, EngineProfile, Role } from "./types";

const LEVEL_RANK: Record<Level, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };

/**
 * Extra kit each setup can count on. At home a sturdy chair stands in for a
 * bench and a stair for a step; a pull-up bar and dip bars are gym-only.
 */
const REQUIREMENT_ACCESS: Record<Equipment, readonly string[]> = {
  FULL_GYM: REQUIREMENTS,
  DUMBBELLS: ["bench", "step"],
  BODYWEIGHT: ["bench", "step"],
};

/** True when this user can safely be given the exercise. */
export function isEligible(
  exercise: EngineExercise,
  profile: Pick<EngineProfile, "equipment" | "level" | "contraindications">,
): boolean {
  return (
    exercise.movementPattern !== null &&
    EQUIPMENT_ACCESS[profile.equipment].includes(exercise.equipment) &&
    exercise.requirements.every((item) => REQUIREMENT_ACCESS[profile.equipment].includes(item)) &&
    !exercise.contraindications.some((tag) => profile.contraindications.includes(tag)) &&
    LEVEL_RANK[exercise.difficulty] <= LEVEL_RANK[profile.level]
  );
}

type Preference = Partial<Record<ExerciseEquipment, number>>;

// How well each kind of equipment suits a slot, 0 to 5. Anything not listed
// (bands, balls, kettlebells) scores 1: usable, never the first choice.
const BIG_LIFTS_GUIDED: Preference = { MACHINE: 5, DUMBBELL: 4, CABLE: 4, BARBELL: 2, BODYWEIGHT: 2 };
const BIG_LIFTS_FREE: Preference = { BARBELL: 5, DUMBBELL: 4, CABLE: 4, MACHINE: 3, BODYWEIGHT: 2 };
const SMALL_LIFTS: Preference = {
  CABLE: 5,
  DUMBBELL: 5,
  MACHINE: 4,
  EZ_BAR: 4,
  BARBELL: 3,
  BODYWEIGHT: 2,
};
const CORE: Preference = { BODYWEIGHT: 5, CABLE: 3, MACHINE: 3 };
const AT_HOME: Preference = { DUMBBELL: 5, BODYWEIGHT: 3 };

function equipmentScore(
  exercise: EngineExercise,
  role: Role,
  profile: Pick<EngineProfile, "equipment" | "level" | "needsClearance">,
): number {
  let table: Preference;
  if (role === "core") table = CORE;
  else if (profile.equipment !== "FULL_GYM") table = AT_HOME;
  else if (role === "accessory") table = SMALL_LIFTS;
  // Beginners and anyone with a health flag start on guided, stable lifts.
  else if (profile.level === "BEGINNER" || profile.needsClearance) table = BIG_LIFTS_GUIDED;
  else table = BIG_LIFTS_FREE;
  return table[exercise.equipment] ?? 1;
}

/** Stable pseudo-random number in [0, 1) from a string (FNV-1a). */
export function hashUnit(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}

export function focusMuscles(profile: Pick<EngineProfile, "focusAreas">): Set<Muscle> {
  return new Set(profile.focusAreas.flatMap((area) => FOCUS_AREA_MUSCLES[area].muscles));
}

export type ScoreContext = {
  profile: EngineProfile;
  role: Role;
  /** How many times each exercise is already in this week's plan. */
  usedThisWeek: ReadonlyMap<string, number>;
  /** Mixed into the tie-break so each day shuffles differently. */
  salt: string;
};

/** Higher is a better fit for the slot. */
export function scoreExercise(exercise: EngineExercise, context: ScoreContext): number {
  const { profile, role } = context;
  const wantsCompound = role === "main" || role === "compound";

  let score = equipmentScore(exercise, role, profile);
  if (role !== "core" && exercise.isCompound === wantsCompound) score += 3;
  if (exercise.difficulty === profile.level) score += 1;
  if (exercise.primaryMuscles.some((muscle) => focusMuscles(profile).has(muscle))) score += 1;
  // Variety: the second push day should not repeat the first one.
  score -= 6 * (context.usedThisWeek.get(exercise.slug) ?? 0);
  // Less than one point, so it only ever settles ties.
  score += hashUnit(`${profile.seed}:${context.salt}:${exercise.slug}`) * 0.9;
  return score;
}

/**
 * The best exercise for a slot: the first pattern in the list that has
 * anything left wins, then the highest score within it.
 */
export function pickForSlot(
  patterns: readonly MovementPattern[],
  pool: readonly EngineExercise[],
  usedToday: ReadonlySet<string>,
  context: ScoreContext,
): EngineExercise | null {
  for (const pattern of patterns) {
    const candidates = pool.filter(
      (exercise) => exercise.movementPattern === pattern && !usedToday.has(exercise.slug),
    );
    if (candidates.length > 0) return best(candidates, context);
  }
  return null;
}

function best(candidates: readonly EngineExercise[], context: ScoreContext): EngineExercise {
  return ranked(candidates, context)[0];
}

function ranked(candidates: readonly EngineExercise[], context: ScoreContext): EngineExercise[] {
  return candidates
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, context) }))
    .sort((a, b) => b.score - a.score || a.exercise.slug.localeCompare(b.exercise.slug))
    .map((entry) => entry.exercise);
}

/**
 * Swaps for an exercise, best first: same movement pattern, then other
 * exercises for the same main muscle. Everything returned passes the same
 * equipment, level and health filters as the plan itself.
 */
export function alternativesFor(
  slug: string,
  profile: EngineProfile,
  exercises: readonly EngineExercise[],
  exclude: readonly string[] = [],
  limit = 6,
): EngineExercise[] {
  const target = exercises.find((exercise) => exercise.slug === slug);
  if (!target) return [];

  const context: ScoreContext = {
    profile,
    role: target.isCompound ? "compound" : "accessory",
    usedThisWeek: new Map(),
    salt: slug,
  };
  const pool = exercises.filter(
    (exercise) =>
      exercise.slug !== slug && !exclude.includes(exercise.slug) && isEligible(exercise, profile),
  );
  const samePattern = pool.filter(
    (exercise) => exercise.movementPattern === target.movementPattern,
  );
  const sameMuscle = pool.filter(
    (exercise) =>
      exercise.movementPattern !== target.movementPattern &&
      exercise.isCompound === target.isCompound &&
      exercise.primaryMuscles[0] === target.primaryMuscles[0],
  );
  return [...ranked(samePattern, context), ...ranked(sameMuscle, context)].slice(0, limit);
}
