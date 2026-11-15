// Vocabulary for the exercise library. Enum-like values match the Prisma
// enums; this file has no database imports so the program engine, the seed
// script and the client can all share it.

import type { Contraindication } from "@/lib/health";
import type { Equipment } from "@/lib/profile-options";

export const MUSCLES = [
  "chest",
  "shoulders",
  "traps",
  "lats",
  "middle_back",
  "lower_back",
  "biceps",
  "triceps",
  "forearms",
  "abdominals",
  "glutes",
  "quadriceps",
  "hamstrings",
  "adductors",
  "abductors",
  "calves",
  "neck",
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EXERCISE_EQUIPMENT = [
  "BODYWEIGHT",
  "DUMBBELL",
  "BARBELL",
  "EZ_BAR",
  "KETTLEBELL",
  "CABLE",
  "MACHINE",
  "BANDS",
  "MEDICINE_BALL",
  "EXERCISE_BALL",
  "FOAM_ROLL",
  "OTHER",
] as const;
export type ExerciseEquipment = (typeof EXERCISE_EQUIPMENT)[number];

export const EXERCISE_CATEGORIES = [
  "STRENGTH",
  "STRETCHING",
  "PLYOMETRICS",
  "CARDIO",
  "POWERLIFTING",
  "OLYMPIC_WEIGHTLIFTING",
  "STRONGMAN",
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

/** How the program engine groups exercises that can stand in for each other. */
export const MOVEMENT_PATTERNS = [
  "squat",
  "hinge",
  "lunge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "chest_fly",
  "lateral_raise",
  "rear_delt",
  "biceps",
  "triceps",
  "core",
  "glutes",
  "leg_curl",
  "leg_extension",
  "calves",
  "shrug",
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

/** Things an exercise needs beyond its main equipment. */
export const REQUIREMENTS = ["bench", "pullup_bar", "dip_bars", "step"] as const;
export type Requirement = (typeof REQUIREMENTS)[number];

export const MEDIA_KINDS = ["FRAME_SEQUENCE", "GIF", "VIDEO", "LOTTIE"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Exercise equipment available at each onboarding equipment level. */
export const EQUIPMENT_ACCESS: Record<Equipment, readonly ExerciseEquipment[]> = {
  FULL_GYM: EXERCISE_EQUIPMENT,
  DUMBBELLS: ["BODYWEIGHT", "DUMBBELL"],
  BODYWEIGHT: ["BODYWEIGHT"],
};

export type { Contraindication };
