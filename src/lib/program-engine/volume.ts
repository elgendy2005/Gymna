import { isTimedExercise } from "@/lib/exercise-options";
import type { Goal } from "@/lib/profile-options";
import type { EngineExercise, EngineProfile, PlannedExercise, Role } from "./types";

type Prescription = { sets: number; repMin: number; repMax: number; restSeconds: number };

/** Sets, reps and rest for a loaded exercise, by goal and by the slot's role. */
export const VOLUME: Record<Goal, Record<Role, Prescription>> = {
  STRENGTH: {
    main: { sets: 4, repMin: 4, repMax: 6, restSeconds: 180 },
    compound: { sets: 3, repMin: 6, repMax: 8, restSeconds: 120 },
    accessory: { sets: 3, repMin: 8, repMax: 12, restSeconds: 75 },
    core: { sets: 3, repMin: 10, repMax: 15, restSeconds: 45 },
  },
  MUSCLE_GAIN: {
    main: { sets: 4, repMin: 8, repMax: 10, restSeconds: 120 },
    compound: { sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
    accessory: { sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
    core: { sets: 3, repMin: 12, repMax: 15, restSeconds: 45 },
  },
  FAT_LOSS: {
    main: { sets: 3, repMin: 10, repMax: 12, restSeconds: 75 },
    compound: { sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
    accessory: { sets: 3, repMin: 12, repMax: 15, restSeconds: 45 },
    core: { sets: 3, repMin: 15, repMax: 20, restSeconds: 30 },
  },
  GENERAL_FITNESS: {
    main: { sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
    compound: { sets: 3, repMin: 10, repMax: 12, restSeconds: 75 },
    accessory: { sets: 2, repMin: 12, repMax: 15, restSeconds: 60 },
    core: { sets: 2, repMin: 12, repMax: 15, restSeconds: 45 },
  },
};

export const MAX_SETS = 5;
export const MIN_SETS = 2;
/** With a health flag: fewer sets, lighter loads (so more reps) and more rest. */
export const CAUTIOUS = { maxSets: 3, minReps: 10, minTopReps: 12, extraRest: 15 };

// Bodyweight moves cannot be made heavier, so they work in higher reps.
const BODYWEIGHT_REPS = { repMin: 8, repMax: 15 };
const BODYWEIGHT_SMALL_REPS = { repMin: 12, repMax: 20 };
// These are hard enough with body weight alone to stay in a lower range.
const HARD_BODYWEIGHT = new Set([
  "Pullups",
  "Chin-Up",
  "Dips_-_Chest_Version",
  "Dips_-_Triceps_Version",
  "Hanging_Leg_Raise",
]);
const HARD_BODYWEIGHT_REPS = { repMin: 5, repMax: 10 };
/** Seconds for holds such as the plank. */
const TIMED_HOLD = { repMin: 20, repMax: 40 };

/** Sets, reps and rest for one exercise in one slot. */
export function prescribe(
  exercise: EngineExercise,
  role: Role,
  profile: Pick<EngineProfile, "goal" | "level" | "needsClearance">,
): Prescription {
  const base = VOLUME[profile.goal][role];
  let { sets, repMin, repMax, restSeconds } = base;

  if (profile.level === "BEGINNER") sets = Math.min(sets, 3);
  if (profile.level === "ADVANCED" && (role === "main" || role === "compound")) sets += 1;

  if (isTimedExercise(exercise.slug)) {
    ({ repMin, repMax } = TIMED_HOLD);
  } else if (exercise.equipment === "BODYWEIGHT") {
    ({ repMin, repMax } = HARD_BODYWEIGHT.has(exercise.slug)
      ? HARD_BODYWEIGHT_REPS
      : role === "main" || role === "compound"
        ? BODYWEIGHT_REPS
        : BODYWEIGHT_SMALL_REPS);
  } else if (profile.needsClearance) {
    repMin = Math.max(repMin, CAUTIOUS.minReps);
    repMax = Math.max(repMax, CAUTIOUS.minTopReps);
  }

  if (profile.needsClearance) {
    sets = Math.min(sets, CAUTIOUS.maxSets);
    restSeconds += CAUTIOUS.extraRest;
  }

  return { sets: Math.min(sets, MAX_SETS), repMin, repMax, restSeconds };
}

const SECONDS_PER_REP = 3.5;
/** Getting to the station, setting the weight, logging. */
const SETUP_SECONDS = 75;
/** General warm-up before the first exercise. */
const WARMUP_MINUTES = 5;
/** Ramp-up sets before the first heavy lift. */
const RAMP_UP_MINUTES = 3;

type Timed = Pick<PlannedExercise, "slug" | "sets" | "repMin" | "repMax" | "restSeconds" | "role">;

/** Seconds one exercise takes, rests included. */
export function exerciseSeconds(exercise: Timed): number {
  const average = (exercise.repMin + exercise.repMax) / 2;
  const work = isTimedExercise(exercise.slug) ? average : average * SECONDS_PER_REP;
  // No rest after the last set: the walk to the next station covers it.
  return exercise.sets * work + (exercise.sets - 1) * exercise.restSeconds + SETUP_SECONDS;
}

/** Whole minutes a session takes from walking in to the last set. */
export function estimateMinutes(exercises: readonly Timed[]): number {
  if (exercises.length === 0) return 0;
  const seconds = exercises.reduce((total, exercise) => total + exerciseSeconds(exercise), 0);
  const rampUp = exercises[0].role === "main" ? RAMP_UP_MINUTES : 0;
  return Math.ceil(seconds / 60 + WARMUP_MINUTES + rampUp);
}
