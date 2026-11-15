import { z } from "zod";
import { EFFORTS } from "@/lib/weight-engine";

const id = z.string().min(1).max(64);

export const LIMITS = {
  weightKg: { max: 1000 },
  // Also seconds for timed holds.
  reps: { max: 3600 },
  notes: { max: 500 },
} as const;

export const startWorkoutSchema = z.object({ planDayId: id });

export const logSetSchema = z.object({
  setId: id,
  weightKg: z.number().min(0).max(LIMITS.weightKg.max).nullable(),
  reps: z.number().int().min(0).max(LIMITS.reps.max).nullable(),
  done: z.boolean(),
});

export const effortSchema = z.object({ sessionExerciseId: id, effort: z.enum(EFFORTS) });

export const sessionExerciseSchema = z.object({ sessionExerciseId: id });

export const skipSchema = z.object({ sessionExerciseId: id, skipped: z.boolean() });

export const swapSchema = z.object({
  sessionExerciseId: id,
  exerciseId: id,
  locale: z.enum(["ar", "en"]),
});

export const notesSchema = z.object({
  sessionExerciseId: id,
  notes: z.string().trim().max(LIMITS.notes.max),
});

export const finishSchema = z.object({ sessionId: id });

export type WorkoutErrorCode =
  | "invalid_input"
  | "unauthorized"
  | "not_found"
  | "has_sets"
  | "not_allowed"
  | "server_error";

export type WorkoutFailure = { ok: false; error: WorkoutErrorCode };
