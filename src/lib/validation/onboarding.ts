import { z } from "zod";
import { HEALTH_QUESTIONS, type HealthQuestion } from "@/lib/health";
import {
  DAYS_PER_WEEK,
  EQUIPMENT,
  GENDERS,
  GOALS,
  LEVELS,
  LIMITS,
  SESSION_MINUTES,
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

export const levelSchema = z.object({ level: z.enum(LEVELS, "levelRequired") });

export const scheduleSchema = z.object({
  daysPerWeek: oneOfNumbers(DAYS_PER_WEEK, "daysRequired"),
  sessionMinutes: oneOfNumbers(SESSION_MINUTES, "sessionRequired"),
  equipment: z.enum(EQUIPMENT, "equipmentRequired"),
});

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

export const onboardingSchema = z.object({
  ...aboutSchema.shape,
  ...goalSchema.shape,
  ...levelSchema.shape,
  ...scheduleSchema.shape,
  ...healthSchema.shape,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export type OnboardingErrorCode = "invalid_input" | "unauthorized" | "server_error";

export type OnboardingResult =
  | { ok: true }
  | { ok: false; error: OnboardingErrorCode };
