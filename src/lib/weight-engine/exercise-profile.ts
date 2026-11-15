import type { ExerciseEquipment, MovementPattern } from "@/lib/exercise-options";
import type { BaselineLift } from "@/lib/profile-options";
import type { LoadType, WeightExercise } from "./types";

export type ExerciseProfile = {
  loadType: LoadType;
  /** Lower-body lifts take bigger steps and a different sex factor. */
  region: "upper" | "lower";
  /** The reference lift this exercise's strength is estimated from. */
  anchor: BaselineLift;
  /**
   * This exercise's one-rep max as a share of the anchor's. Per dumbbell
   * for dumbbell exercises.
   */
  ratio: number;
};

const LOAD_TYPES: Record<ExerciseEquipment, LoadType> = {
  BARBELL: "barbell",
  EZ_BAR: "ez_bar",
  DUMBBELL: "dumbbell",
  KETTLEBELL: "dumbbell",
  MACHINE: "machine",
  CABLE: "cable",
  BODYWEIGHT: "bodyweight",
  // Nothing to put a number on: these progress in reps like bodyweight moves.
  BANDS: "bodyweight",
  MEDICINE_BALL: "bodyweight",
  EXERCISE_BALL: "bodyweight",
  FOAM_ROLL: "bodyweight",
  OTHER: "bodyweight",
};

const LOWER: ReadonlySet<MovementPattern> = new Set([
  "squat",
  "hinge",
  "lunge",
  "glutes",
  "leg_curl",
  "leg_extension",
  "calves",
]);

type Ratios = Partial<Record<Exclude<LoadType, "bodyweight">, number>>;

// Typical strength on each kind of exercise relative to its anchor lift.
// They only place the first session; logged sets take over after that.
const PATTERNS: Record<MovementPattern, { anchor: BaselineLift; ratios: Ratios; fallback: number }> = {
  horizontal_push: {
    anchor: "bench_press",
    ratios: { barbell: 1, dumbbell: 0.38, machine: 0.9, cable: 0.4 },
    fallback: 0.9,
  },
  vertical_push: {
    anchor: "shoulder_press",
    ratios: { barbell: 1, dumbbell: 0.38, machine: 0.95, cable: 0.4 },
    fallback: 0.9,
  },
  horizontal_pull: {
    anchor: "row",
    ratios: { barbell: 1, dumbbell: 0.4, machine: 1, cable: 1 },
    fallback: 0.9,
  },
  vertical_pull: {
    anchor: "lat_pulldown",
    ratios: { cable: 1, machine: 1, dumbbell: 0.4 },
    fallback: 1,
  },
  squat: {
    anchor: "squat",
    ratios: { barbell: 1, dumbbell: 0.22, machine: 1 },
    fallback: 0.8,
  },
  hinge: {
    anchor: "deadlift",
    ratios: { barbell: 1, dumbbell: 0.3, machine: 0.6, cable: 0.35 },
    fallback: 0.6,
  },
  lunge: {
    anchor: "squat",
    ratios: { barbell: 0.5, dumbbell: 0.18, machine: 0.5 },
    fallback: 0.4,
  },
  glutes: {
    anchor: "squat",
    ratios: { barbell: 0.9, dumbbell: 0.3, machine: 0.5, cable: 0.12 },
    fallback: 0.4,
  },
  chest_fly: {
    anchor: "bench_press",
    ratios: { dumbbell: 0.17, cable: 0.15, machine: 0.5 },
    fallback: 0.3,
  },
  lateral_raise: {
    anchor: "shoulder_press",
    ratios: { dumbbell: 0.15, cable: 0.1, machine: 0.4 },
    fallback: 0.2,
  },
  rear_delt: {
    anchor: "row",
    ratios: { dumbbell: 0.1, cable: 0.12, machine: 0.4 },
    fallback: 0.2,
  },
  biceps: {
    anchor: "row",
    ratios: { barbell: 0.42, ez_bar: 0.42, dumbbell: 0.17, cable: 0.38, machine: 0.38 },
    fallback: 0.35,
  },
  triceps: {
    anchor: "bench_press",
    ratios: { barbell: 0.4, ez_bar: 0.35, dumbbell: 0.13, cable: 0.35, machine: 0.4 },
    fallback: 0.35,
  },
  core: {
    anchor: "row",
    ratios: { cable: 0.5, machine: 0.5 },
    fallback: 0.3,
  },
  leg_curl: { anchor: "squat", ratios: { machine: 0.4 }, fallback: 0.4 },
  leg_extension: { anchor: "squat", ratios: { machine: 0.5 }, fallback: 0.5 },
  calves: {
    anchor: "squat",
    ratios: { machine: 0.8, barbell: 0.8, dumbbell: 0.25 },
    fallback: 0.5,
  },
  shrug: {
    anchor: "deadlift",
    ratios: { barbell: 0.7, dumbbell: 0.25, cable: 0.5 },
    fallback: 0.5,
  },
};

/** Exercises that differ from the usual for their pattern and equipment. */
const OVERRIDES: Record<string, Partial<ExerciseProfile>> = {
  "Barbell_Incline_Bench_Press_-_Medium_Grip": { ratio: 0.8 },
  Incline_Dumbbell_Press: { ratio: 0.33 },
  Dumbbell_Floor_Press: { ratio: 0.36 },
  "Close-Grip_Barbell_Bench_Press": { ratio: 0.85 },
  Front_Barbell_Squat: { ratio: 0.8 },
  Smith_Machine_Squat: { ratio: 0.95 },
  Leg_Press: { ratio: 1.8 },
  // One weight held in both hands.
  Goblet_Squat: { ratio: 0.28 },
  Plie_Dumbbell_Squat: { ratio: 0.3 },
  Standing_Dumbbell_Triceps_Extension: { ratio: 0.2 },
  Dumbbell_Step_Ups: { ratio: 0.15 },
  Romanian_Deadlift: { ratio: 0.7 },
  Good_Morning: { ratio: 0.4 },
  // Listed under "other" equipment, loaded like a barbell.
  Trap_Bar_Deadlift: { loadType: "barbell", ratio: 1.05 },
  "T-Bar_Row_with_Handle": { ratio: 0.9 },
  "One-Arm_Dumbbell_Row": { ratio: 0.45 },
  "Straight-Arm_Pulldown": { ratio: 0.45 },
  Face_Pull: { ratio: 0.35 },
  Barbell_Hip_Thrust: { ratio: 1 },
  Barbell_Glute_Bridge: { ratio: 1 },
  Preacher_Curl: { ratio: 0.35 },
  "Single-Leg_Leg_Extension": { ratio: 0.25 },
  Seated_Calf_Raise: { ratio: 0.5 },
  Calf_Press_On_The_Leg_Press_Machine: { ratio: 1.2 },
};

/** The exercise each reference lift is measured on. */
export const ANCHOR_EXERCISES: Record<BaselineLift, string> = {
  bench_press: "Barbell_Bench_Press_-_Medium_Grip",
  squat: "Barbell_Squat",
  deadlift: "Barbell_Deadlift",
  shoulder_press: "Standing_Military_Press",
  row: "Bent_Over_Barbell_Row",
  lat_pulldown: "Wide-Grip_Lat_Pulldown",
};

/** How an exercise is loaded and which lift its starting weight comes from. */
export function exerciseProfile(exercise: WeightExercise): ExerciseProfile {
  const pattern = exercise.movementPattern;
  const loadType = LOAD_TYPES[exercise.equipment];
  const table = pattern ? PATTERNS[pattern] : null;

  const base: ExerciseProfile = {
    loadType,
    region: pattern && LOWER.has(pattern) ? "lower" : "upper",
    anchor: table?.anchor ?? "bench_press",
    ratio: 0.3,
  };
  const profile = { ...base, ...OVERRIDES[exercise.slug] };
  if (OVERRIDES[exercise.slug]?.ratio === undefined && table && profile.loadType !== "bodyweight") {
    profile.ratio = table.ratios[profile.loadType] ?? table.fallback;
  }
  return profile;
}
