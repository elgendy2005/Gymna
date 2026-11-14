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
} as const;
