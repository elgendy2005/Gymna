import type {
  ExerciseEquipment,
  MovementPattern,
  Muscle,
} from "@/lib/exercise-options";
import type { Equipment, FocusArea, Goal, Level } from "@/lib/profile-options";

export const DAY_TYPES = ["FULL_BODY", "UPPER", "LOWER", "PUSH", "PULL", "LEGS"] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const SPLITS = [
  "full_body",
  "upper_lower",
  "push_pull_legs",
  "ppl_upper_lower",
  "push_pull_legs_x2",
] as const;
export type Split = (typeof SPLITS)[number];

/**
 * What a slot is for. It decides sets, reps and rest:
 * - main: the first heavy compound of the day
 * - compound: other multi-joint lifts
 * - accessory: single-joint work
 * - core: abs and trunk
 */
export type Role = "main" | "compound" | "accessory" | "core";

/** The exercise fields the engine reads. `slug` is the identifier. */
export type EngineExercise = {
  slug: string;
  equipment: ExerciseEquipment;
  difficulty: Level;
  isCompound: boolean;
  movementPattern: MovementPattern | null;
  primaryMuscles: readonly Muscle[];
  contraindications: readonly string[];
  requirements: readonly string[];
};

/** The answers a plan is built from. */
export type EngineProfile = {
  goal: Goal;
  level: Level;
  daysPerWeek: number;
  /** Weekdays to train on, 0 = Saturday. One per training day, ascending. */
  trainingDays: readonly number[];
  sessionMinutes: number;
  equipment: Equipment;
  focusAreas: readonly FocusArea[];
  /** Health tags to avoid, from the screening. */
  contraindications: readonly string[];
  /** Any "yes" in the screening: the plan stays conservative. */
  needsClearance: boolean;
  /** Breaks ties between equally good exercises, so two users with the same
   *  answers can still get different (but each stable) plans. */
  seed: string;
};

export type PlannedExercise = {
  slug: string;
  pattern: MovementPattern;
  role: Role;
  sets: number;
  /** Reps, or seconds for timed holds such as the plank. */
  repMin: number;
  repMax: number;
  restSeconds: number;
  /** True when a focus area added this exercise or added a set to it. */
  focusExtra: boolean;
};

export type PlannedDay = {
  order: number;
  /** 0 = Saturday. */
  weekday: number;
  type: DayType;
  estimatedMinutes: number;
  exercises: PlannedExercise[];
};

export type GeneratedPlan = {
  split: Split;
  engineVersion: number;
  days: PlannedDay[];
};
