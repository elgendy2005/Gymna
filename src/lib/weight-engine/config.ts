// Every number the weight engine uses, in one place.

import type { BaselineLift, Level, TrainingExperience } from "@/lib/profile-options";
import type { Effort } from "./types";

/**
 * Share of the estimated one-rep max to load for a rep target, as
 * [reps, share] points. Values between points are interpolated.
 */
export const PERCENT_OF_E1RM: readonly (readonly [number, number])[] = [
  [1, 1],
  [3, 0.92],
  [5, 0.85],
  [8, 0.77],
  [10, 0.74],
  [12, 0.7],
  [15, 0.65],
  [20, 0.58],
];

/** Smallest jump for a compound lift, by display unit. Single-joint lifts take the next loadable weight. */
export const COMPOUND_STEP = {
  METRIC: { upperKg: 2.5, lowerKg: 5 },
  // 5 lb and 10 lb.
  IMPERIAL: { upperKg: 2.26796185, lowerKg: 4.5359237 },
} as const;

/** What can be loaded, in the display unit's own numbers. */
export const LOAD_GRID = {
  METRIC: { barbell: { step: 2.5, min: 20 }, ez_bar: { step: 2.5, min: 10 } },
  IMPERIAL: {
    barbell: { step: 5, min: 45 },
    ez_bar: { step: 5, min: 25 },
    dumbbell: { step: 5, min: 5 },
    stack: { step: 10, min: 10 },
  },
} as const;

export const PLATES = {
  METRIC: [25, 20, 15, 10, 5, 2.5, 1.25],
  IMPERIAL: [45, 35, 25, 10, 5, 2.5],
} as const;

/** Two weights closer than this are the same weight. */
export const SAME_WEIGHT_KG = 0.05;

/** Sessions older than this no longer count towards the current estimate. */
export const E1RM_WINDOW_DAYS = 42;
/** Estimates from a set get unreliable past this many reps. */
export const MAX_E1RM_REPS = 20;

/** Missing the bottom of the range this many sessions in a row lowers the weight. */
export const MISSES_BEFORE_REDUCE = 2;
export const REDUCE_FACTOR = 0.9;
/** This many sessions at one weight with no more reps is a stall. */
export const STALL_SESSIONS = 3;
export const DELOAD_FACTOR = 0.9;
/** With a health flag, the weight goes up only after this many good sessions. */
export const CAUTIOUS_GOOD_SESSIONS = 2;
/** With a health flag every estimate is taken down by this much. */
export const CAUTIOUS_FACTOR = 0.9;

/** Reps left in the tank each answer stands for. */
export const REPS_IN_RESERVE: Record<Effort, number> = { EASY: 4, RIGHT: 2, HARD: 0 };
/** The most a calibration set may raise the remaining sets by. */
export const MAX_CALIBRATION_JUMP = { normal: 1.2, cautious: 1.1 };
/** "Too hard" in a calibration set lowers the remaining sets by at least this. */
export const HARD_SET_FACTOR = 0.95;

/** One-rep max of each reference lift relative to the bench press. */
export const LIFT_RATIOS: Record<BaselineLift, number> = {
  bench_press: 1,
  squat: 1.3,
  deadlift: 1.55,
  shoulder_press: 0.62,
  row: 0.85,
  lat_pulldown: 0.85,
};

/** One-rep max as a share of body weight for an untrained adult man. */
export const BODYWEIGHT_RATIOS: Record<BaselineLift, number> = {
  bench_press: 0.55,
  squat: 0.7,
  deadlift: 0.9,
  shoulder_press: 0.35,
  row: 0.5,
  lat_pulldown: 0.55,
};
/** Strength does not keep rising with body weight, nor fall forever with it. */
export const BODYWEIGHT_CLAMP_KG = { min: 45, max: 100 };

export const EXPERIENCE_STRENGTH: Record<TrainingExperience, number> = {
  NEVER: 0.8,
  UNDER_6_MONTHS: 1,
  OVER_6_MONTHS: 1.3,
  OVER_2_YEARS: 1.6,
};
/** Used when the experience question was never answered. */
export const LEVEL_STRENGTH: Record<Level, number> = {
  BEGINNER: 0.9,
  INTERMEDIATE: 1.25,
  ADVANCED: 1.55,
};

export const FEMALE_FACTOR = { upper: 0.55, lower: 0.7 };

/** [minimum age, factor], oldest first. */
export const AGE_FACTORS: readonly (readonly [number, number])[] = [
  [60, 0.7],
  [50, 0.8],
  [40, 0.9],
];

/** How far below the estimate a first session starts, by where the estimate came from. */
export const START_FACTOR = { baseline: 1, related: 0.93, bodyweight: 0.9 };
/** Less experience, more margin on the first session. */
export const EXPERIENCE_MARGIN: Record<TrainingExperience, number> = {
  NEVER: 0.85,
  UNDER_6_MONTHS: 0.9,
  OVER_6_MONTHS: 0.95,
  OVER_2_YEARS: 0.95,
};
export const LEVEL_MARGIN: Record<Level, number> = {
  BEGINNER: 0.85,
  INTERMEDIATE: 0.95,
  ADVANCED: 0.95,
};

/** Warm-up ramp for the first heavy lift: share of the working weight and reps. */
export const WARMUP_STEPS: readonly (readonly [number, number])[] = [
  [0.5, 5],
  [0.75, 3],
];
export const WARMUP_BAR_REPS = 10;
/** A working weight under this many times the empty bar needs no ramp. */
export const WARMUP_MIN_BAR_MULTIPLE = 1.5;
/** Without a bar: skip the ramp under this many loading steps. */
export const WARMUP_MIN_STEPS = 4;
