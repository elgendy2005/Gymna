// Option lists for the training profile. The string values match the Prisma
// enums, so they pass straight to the database, but this file stays free of
// database imports so the program engine and the client can share it.

export const GENDERS = ["MALE", "FEMALE"] as const;
export const GOALS = [
  "FAT_LOSS",
  "MUSCLE_GAIN",
  "STRENGTH",
  "GENERAL_FITNESS",
] as const;
export const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export const EQUIPMENT = ["FULL_GYM", "DUMBBELLS", "BODYWEIGHT"] as const;
export const UNIT_SYSTEMS = ["METRIC", "IMPERIAL"] as const;

export const DAYS_PER_WEEK = [2, 3, 4, 5, 6] as const;
export const SESSION_MINUTES = [30, 45, 60, 75, 90] as const;

/** How long the user has trained with weights. */
export const TRAINING_EXPERIENCE = [
  "NEVER",
  "UNDER_6_MONTHS",
  "OVER_6_MONTHS",
  "OVER_2_YEARS",
] as const;
export type TrainingExperience = (typeof TRAINING_EXPERIENCE)[number];

/** Body areas the user can ask for extra volume on. */
export const FOCUS_AREAS = [
  "arms",
  "chest",
  "back",
  "shoulders",
  "legs",
  "glutes",
  "abs",
] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];
/** More than this and "focus" stops meaning anything. */
export const MAX_FOCUS_AREAS = 3;

/** Lifts onboarding asks a current weight for. */
export const BASELINE_LIFTS = [
  "bench_press",
  "squat",
  "deadlift",
  "shoulder_press",
  "row",
  "lat_pulldown",
] as const;
export type BaselineLift = (typeof BASELINE_LIFTS)[number];

/** Weekday numbers. The training week starts on Saturday: 0 is Saturday, 6 is Friday. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const DEFAULT_TRAINING_DAYS: Record<number, readonly number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

/** A spread of training days with rest between them where the count allows. */
export function defaultTrainingDays(daysPerWeek: number): number[] {
  return [...(DEFAULT_TRAINING_DAYS[daysPerWeek] ?? DEFAULT_TRAINING_DAYS[3])];
}

/** The saved training days if they still match the day count, else the default spread. */
export function resolveTrainingDays(saved: readonly number[], daysPerWeek: number): number[] {
  const valid = [...new Set(saved)].filter((day) => day >= 0 && day <= 6);
  return valid.length === daysPerWeek
    ? valid.sort((a, b) => a - b)
    : defaultTrainingDays(daysPerWeek);
}

export const DUMBBELL_STEPS_KG = [2, 2.5] as const;
export const MACHINE_STEPS_KG = [2.5, 5, 10] as const;

export type Gender = (typeof GENDERS)[number];
export type Goal = (typeof GOALS)[number];
export type Level = (typeof LEVELS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

export const LIMITS = {
  age: { min: 16, max: 90 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 250 },
  notes: { max: 500 },
  liftKg: { min: 1, max: 500 },
  // Estimates from a set get unreliable past about 20 reps.
  liftReps: { min: 1, max: 20 },
} as const;
