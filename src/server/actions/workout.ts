"use server";

import type { z } from "zod";
import { localDateTime } from "@/lib/schedule";
import {
  effortSchema,
  finishSchema,
  logSetSchema,
  notesSchema,
  sessionExerciseSchema,
  skipSchema,
  startWorkoutSchema,
  swapSchema,
  type WorkoutFailure,
} from "@/lib/validation/workout";
import type { SetAdjustment } from "@/lib/weight-engine";
import type { WorkoutExercise, WorkoutSet } from "@/lib/workout";
import { getActivePlan } from "@/server/queries/plan";
import { getUserProfile, type UserProfile } from "@/server/queries/profile";
import { getSessionUser } from "@/server/session";
import {
  addSet,
  calibrate,
  finalizeSession,
  logSet,
  startSession,
  swapExercise,
  updateSessionExercise,
} from "@/server/workout";

// Every action here checks the session first and only ever touches rows
// that belong to the signed-in user's own workout in progress.

type Result<T = object> = ({ ok: true } & T) | WorkoutFailure;

/** Shared front door: sign-in check, input validation, error handling. */
async function run<Schema extends z.ZodType, T>(
  name: string,
  schema: Schema,
  input: unknown,
  work: (
    data: z.infer<Schema>,
    context: { userId: string; profile: UserProfile },
  ) => Promise<Result<T>>,
): Promise<Result<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  try {
    const profile = await getUserProfile(user.id);
    if (!profile) return { ok: false, error: "not_found" };
    return await work(parsed.data, { userId: user.id, profile });
  } catch (error) {
    console.error(`${name} failed`, error);
    return { ok: false, error: "server_error" };
  }
}

/** Starts (or resumes) a workout from a day of the user's own plan. */
export async function startWorkoutAction(input: unknown): Promise<Result<{ sessionId: string }>> {
  return run(
    "startWorkoutAction",
    startWorkoutSchema,
    input,
    async (data, { userId, profile }): Promise<Result<{ sessionId: string }>> => {
      const plan = await getActivePlan(userId);
      const day = plan?.days.find((item) => item.id === data.planDayId);
      if (!day) return { ok: false, error: "not_found" };

      const now = new Date();
      const { date } = localDateTime(now, profile.timezone);
      return { ok: true, sessionId: await startSession(userId, profile, day, date, now) };
    },
  );
}

/** Saves a set row, checked or not. */
export async function logSetAction(
  input: unknown,
): Promise<Result<{ isPr: boolean; adjustment: SetAdjustment | null }>> {
  return run("logSetAction", logSetSchema, input, async (data, { userId, profile }) => {
    const result = await logSet(userId, profile, data);
    return result.ok ? result : { ok: false, error: "not_found" };
  });
}

/** "How did the first set feel?" in a calibration session. */
export async function calibrateAction(
  input: unknown,
): Promise<Result<{ adjustment: SetAdjustment | null }>> {
  return run("calibrateAction", effortSchema, input, async (data, { userId, profile }) => ({
    ok: true,
    adjustment: await calibrate(userId, profile, data.sessionExerciseId, data.effort),
  }));
}

/** "How did that exercise feel?" once its sets are done. */
export async function exerciseFeedbackAction(input: unknown): Promise<Result> {
  return run("exerciseFeedbackAction", effortSchema, input, async (data, { userId }) => {
    const saved = await updateSessionExercise(userId, data.sessionExerciseId, {
      feedback: data.effort,
      status: "DONE",
    });
    return saved ? { ok: true } : { ok: false, error: "not_found" };
  });
}

export async function addSetAction(input: unknown): Promise<Result<{ set: WorkoutSet }>> {
  return run("addSetAction", sessionExerciseSchema, input, async (data, { userId }) => {
    const set = await addSet(userId, data.sessionExerciseId);
    return set ? { ok: true, set } : { ok: false, error: "not_found" };
  });
}

export async function skipExerciseAction(input: unknown): Promise<Result> {
  return run("skipExerciseAction", skipSchema, input, async (data, { userId }) => {
    const saved = await updateSessionExercise(userId, data.sessionExerciseId, {
      status: data.skipped ? "SKIPPED" : "PENDING",
    });
    return saved ? { ok: true } : { ok: false, error: "not_found" };
  });
}

export async function swapExerciseAction(
  input: unknown,
): Promise<Result<{ exercise: WorkoutExercise }>> {
  return run("swapExerciseAction", swapSchema, input, async (data, { userId, profile }) =>
    swapExercise(userId, profile, data.sessionExerciseId, data.exerciseId, data.locale),
  );
}

export async function saveNotesAction(input: unknown): Promise<Result> {
  return run("saveNotesAction", notesSchema, input, async (data, { userId }) => {
    const saved = await updateSessionExercise(userId, data.sessionExerciseId, {
      notes: data.notes || null,
    });
    return saved ? { ok: true } : { ok: false, error: "not_found" };
  });
}

/** Ends the workout. `completed` is false when no set was logged. */
export async function finishWorkoutAction(
  input: unknown,
): Promise<Result<{ completed: boolean }>> {
  return run("finishWorkoutAction", finishSchema, input, async (data, { userId, profile }) => {
    const status = await finalizeSession(userId, data.sessionId, new Date(), profile.needsClearance);
    return status ? { ok: true, completed: status === "COMPLETED" } : { ok: false, error: "not_found" };
  });
}
