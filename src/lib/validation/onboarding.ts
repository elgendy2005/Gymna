import { z } from "zod";
import { HEALTH_QUESTIONS, type HealthQuestion } from "@/lib/health";
import {
  BASELINE_LIFTS,
  DAYS_PER_WEEK,
  EQUIPMENT,
  FOCUS_AREAS,
  GENDERS,
  GOALS,
  LEVELS,
  LIMITS,
  MAX_FOCUS_AREAS,
  SESSION_MINUTES,
  TRAINING_EXPERIENCE,
  UNIT_SYSTEMS,
} from "@/lib/profile-options";

// Messages are translation keys under `Onboarding.errors`.

const oneOfNumbers = <T extends readonly number[]>(values: T, message: string) =>
  z
    .number(message)
    .refine((value): value is T[number] => values.includes(value), message);

export const aboutSchema = z.object({
  unitSystem: z.enum(UNIT_SYSTEMS),
  age: z
    .number("ageRequired")
    .int("ageRequired")
    .min(LIMITS.age.min, "ageRange")
    .max(LIMITS.age.max, "ageRange"),
  gender: z.enum(GENDERS, "genderRequired"),
  heightCm: z
    .number("heightRequired")
    .min(LIMITS.heightCm.min, "heightRange")
    .max(LIMITS.heightCm.max, "heightRange"),
  weightKg: z
    .number("weightRequired")
    .min(LIMITS.weightKg.min, "weightRange")
    .max(LIMITS.weightKg.max, "weightRange"),
});

export const goalSchema = z.object({ goal: z.enum(GOALS, "goalRequired") });

export const focusAreasSchema = z
  .array(z.enum(FOCUS_AREAS))
  .max(MAX_FOCUS_AREAS, "focusTooMany")
  .refine((areas) => new Set(areas).size === areas.length, "focusTooMany");

export const focusSchema = z.object({ focusAreas: focusAreasSchema });

export const levelSchema = z.object({
  level: z.enum(LEVELS, "levelRequired"),
  experience: z.enum(TRAINING_EXPERIENCE, "experienceRequired"),
});

/** A set the user can do today: enough to estimate their strength on a lift. */
export const liftSchema = z.object({
  lift: z.enum(BASELINE_LIFTS),
  weightKg: z
    .number("liftIncomplete")
    .min(LIMITS.liftKg.min, "liftRange")
    .max(LIMITS.liftKg.max, "liftRange"),
  reps: z
    .number("liftIncomplete")
    .int("liftRange")
    .min(LIMITS.liftReps.min, "liftRange")
    .max(LIMITS.liftReps.max, "liftRange"),
});

export const liftsSchema = z.object({
  // Optional: an empty list means "I don't know my weights".
  lifts: z
    .array(liftSchema)
    .max(BASELINE_LIFTS.length)
    .refine(
      (lifts) => new Set(lifts.map((entry) => entry.lift)).size === lifts.length,
      "liftIncomplete",
    ),
});

/** Weekday numbers, 0 = Saturday. One entry per training day, no repeats. */
export const trainingDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .refine((days) => new Set(days).size === days.length, "trainingDaysCount");

export const scheduleSchema = z
  .object({
    daysPerWeek: oneOfNumbers(DAYS_PER_WEEK, "daysRequired"),
    trainingDays: trainingDaysSchema,
    sessionMinutes: oneOfNumbers(SESSION_MINUTES, "sessionRequired"),
    equipment: z.enum(EQUIPMENT, "equipmentRequired"),
  })
  .refine((value) => value.trainingDays.length === value.daysPerWeek, {
    path: ["trainingDays"],
    message: "trainingDaysCount",
  });

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** IANA zone name as the browser reports it. */
export const timezoneSchema = z.string().max(64).refine(isTimeZone);

const healthAnswers = z.object(
  Object.fromEntries(
    HEALTH_QUESTIONS.map((question) => [question, z.boolean("healthRequired")]),
  ) as Record<HealthQuestion, z.ZodBoolean>,
);

export const healthSchema = z.object({
  health: healthAnswers,
  notes: z.string().trim().max(LIMITS.notes.max, "notesTooLong"),
  // The medical disclaimer must be accepted before a plan is built.
  disclaimerAccepted: z.literal(true, "disclaimerRequired"),
});

export const onboardingSchema = z
  .object({
    ...aboutSchema.shape,
    ...goalSchema.shape,
    ...focusSchema.shape,
    ...levelSchema.shape,
    ...liftsSchema.shape,
    ...scheduleSchema.shape,
    ...healthSchema.shape,
    // Missing when the browser cannot name its zone; the saved one is kept.
    timezone: timezoneSchema.optional(),
  })
  .refine((value) => value.trainingDays.length === value.daysPerWeek, {
    path: ["trainingDays"],
    message: "trainingDaysCount",
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export type OnboardingErrorCode = "invalid_input" | "unauthorized" | "server_error";

export type OnboardingResult =
  | { ok: true }
  | { ok: false; error: OnboardingErrorCode };
