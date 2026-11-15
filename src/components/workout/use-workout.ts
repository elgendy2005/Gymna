"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkoutErrorCode } from "@/lib/validation/workout";
import type { Effort, SetAdjustment } from "@/lib/weight-engine";
import {
  isExerciseComplete,
  nextOpenExercise,
  type WorkoutExercise,
  type WorkoutSet,
  type WorkoutView,
} from "@/lib/workout";
import {
  addSetAction,
  calibrateAction,
  exerciseFeedbackAction,
  finishWorkoutAction,
  logSetAction,
  saveNotesAction,
  skipExerciseAction,
  swapExerciseAction,
} from "@/server/actions/workout";

/** Something the screen should tell the user about. */
export type WorkoutEvent =
  | { type: "error"; code: WorkoutErrorCode }
  | { type: "pr"; exerciseId: string }
  | { type: "adjusted"; exerciseId: string; adjustment: SetAdjustment }
  | { type: "set_done"; exerciseId: string; restSeconds: number; kind: WorkoutSet["kind"] }
  | { type: "swapped"; exercise: WorkoutExercise };

type Failure = { ok: false; error: WorkoutErrorCode };

/** Runs a server action; a network failure becomes an ordinary error result. */
async function call<T extends { ok: true }>(action: () => Promise<T | Failure>): Promise<T | Failure> {
  try {
    return await action();
  } catch {
    return { ok: false, error: "server_error" };
  }
}

const storageKey = (sessionId: string) => `gymna.workout.${sessionId}.open`;

function readOpenCard(view: WorkoutView): string | null {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(storageKey(view.id));
  } catch {
    // Storage can be blocked; the first open exercise is a fine default.
  }
  if (saved === "none") return null;
  if (saved && view.exercises.some((exercise) => exercise.id === saved)) return saved;
  return nextOpenExercise(view.exercises)?.id ?? null;
}

/**
 * The state of the workout screen. Every change is applied right away and
 * saved by a server action behind it, so the database is the source of
 * truth: a refresh or another device picks the session up where it is.
 */
export function useWorkout(view: WorkoutView, locale: string, notify: (event: WorkoutEvent) => void) {
  const [exercises, setExercises] = useState(view.exercises);
  const [openId, setOpenId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // The latest state, updated in step with every change, so an action that
  // follows another one in the same tick (a blur, then a tap on the check
  // button) already sees the first change.
  const latest = useRef(exercises);

  // The open card is a per-device convenience, restored after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, which the server render cannot see
    setOpenId(readOpenCard(view));
    // Only on mount: later changes come from the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useCallback(
    (id: string | null) => {
      setOpenId(id);
      try {
        window.localStorage.setItem(storageKey(view.id), id ?? "none");
      } catch {
        // Not being able to remember the open card is harmless.
      }
    },
    [view.id],
  );

  const patchExercise = useCallback(
    (id: string, change: (exercise: WorkoutExercise) => WorkoutExercise) => {
      latest.current = latest.current.map((exercise) =>
        exercise.id === id ? change(exercise) : exercise,
      );
      setExercises(latest.current);
    },
    [],
  );

  const patchSet = useCallback(
    (exerciseId: string, setId: string, patch: Partial<WorkoutSet>) =>
      patchExercise(exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
      })),
    [patchExercise],
  );

  /** Moves the sets that are still open to a new weight. */
  const applyAdjustment = useCallback(
    (exerciseId: string, adjustment: SetAdjustment, afterOrder = -1) =>
      patchExercise(exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.kind === "WORKING" && !set.done && set.order > afterOrder
            ? { ...set, weightKg: adjustment.weightKg }
            : set,
        ),
      })),
    [patchExercise],
  );

  const find = (exerciseId: string, setId?: string) => {
    const exercise = latest.current.find((item) => item.id === exerciseId);
    return { exercise, set: exercise?.sets.find((item) => item.id === setId) };
  };

  /** Saves a row as it stands, with new values and/or a new checked state. */
  const saveSet = useCallback(
    async (exerciseId: string, setId: string, patch: Partial<WorkoutSet>) => {
      const { exercise, set } = find(exerciseId, setId);
      if (!exercise || !set) return;

      const next = { ...set, ...patch };
      // Checking a row with no reps typed counts the reps it was showing.
      if (next.done && next.reps === null) next.reps = next.targetReps;
      const checking = next.done && !set.done;
      // A new weight on an open set carries down to the open sets after it.
      // They are saved by the same request as this row.
      const followers =
        patch.weightKg !== undefined && !set.done && !next.done
          ? exercise.sets.filter(
              (later) => later.kind === set.kind && later.order > set.order && !later.done,
            )
          : [];
      patchSet(exerciseId, setId, { ...next, isPr: next.done ? set.isPr : false });
      for (const later of followers) patchSet(exerciseId, later.id, { weightKg: next.weightKg });
      if (checking) {
        notify({ type: "set_done", exerciseId, restSeconds: exercise.restSeconds, kind: set.kind });
      }

      const result = await call(() =>
        logSetAction({
          setId,
          weightKg: next.weightKg,
          reps: next.reps,
          done: next.done,
          carry: followers.length > 0,
        }),
      );
      if (!result.ok) {
        patchSet(exerciseId, setId, set);
        for (const later of followers) patchSet(exerciseId, later.id, { weightKg: later.weightKg });
        notify({ type: "error", code: result.error });
        return;
      }
      patchSet(exerciseId, setId, { isPr: result.isPr });
      if (result.isPr && checking) notify({ type: "pr", exerciseId });
      if (result.adjustment) {
        applyAdjustment(exerciseId, result.adjustment, set.order);
        notify({ type: "adjusted", exerciseId, adjustment: result.adjustment });
      }
    },
    [applyAdjustment, notify, patchSet],
  );

  const calibrate = useCallback(
    async (exerciseId: string, effort: Effort) => {
      patchExercise(exerciseId, (exercise) => ({ ...exercise, calibrationEffort: effort }));
      const result = await call(() => calibrateAction({ sessionExerciseId: exerciseId, effort }));
      if (!result.ok) {
        patchExercise(exerciseId, (exercise) => ({ ...exercise, calibrationEffort: null }));
        notify({ type: "error", code: result.error });
        return;
      }
      if (result.adjustment) {
        if (result.adjustment.code !== "keep") applyAdjustment(exerciseId, result.adjustment);
        notify({ type: "adjusted", exerciseId, adjustment: result.adjustment });
      }
    },
    [applyAdjustment, notify, patchExercise],
  );

  const giveFeedback = useCallback(
    async (exerciseId: string, effort: Effort) => {
      const { exercise } = find(exerciseId);
      if (!exercise) return;
      patchExercise(exerciseId, (item) => ({ ...item, feedback: effort, status: "DONE" }));
      // On to the next exercise that still has work in it.
      const upcoming = nextOpenExercise(
        latest.current.map((item) => (item.id === exerciseId ? { ...item, status: "DONE" as const } : item)),
        exerciseId,
      );
      open(upcoming && upcoming.id !== exerciseId ? upcoming.id : null);

      const result = await call(() =>
        exerciseFeedbackAction({ sessionExerciseId: exerciseId, effort }),
      );
      if (!result.ok) {
        patchExercise(exerciseId, (item) => ({
          ...item,
          feedback: exercise.feedback,
          status: exercise.status,
        }));
        notify({ type: "error", code: result.error });
      }
    },
    [notify, open, patchExercise],
  );

  const addSet = useCallback(
    async (exerciseId: string) => {
      const result = await call(() => addSetAction({ sessionExerciseId: exerciseId }));
      if (!result.ok) {
        notify({ type: "error", code: result.error });
        return;
      }
      patchExercise(exerciseId, (exercise) => ({
        ...exercise,
        // More work was added, so the "how did it feel" answer is asked again.
        status: exercise.status === "DONE" ? "PENDING" : exercise.status,
        feedback: null,
        sets: [...exercise.sets, result.set],
      }));
    },
    [notify, patchExercise],
  );

  const skip = useCallback(
    async (exerciseId: string, skipped: boolean) => {
      const { exercise } = find(exerciseId);
      if (!exercise) return;
      patchExercise(exerciseId, (item) => ({ ...item, status: skipped ? "SKIPPED" : "PENDING" }));
      if (skipped) {
        const upcoming = nextOpenExercise(
          latest.current.map((item) =>
            item.id === exerciseId ? { ...item, status: "SKIPPED" as const } : item,
          ),
          exerciseId,
        );
        open(upcoming?.id ?? null);
      } else {
        open(exerciseId);
      }

      const result = await call(() =>
        skipExerciseAction({ sessionExerciseId: exerciseId, skipped }),
      );
      if (!result.ok) {
        patchExercise(exerciseId, (item) => ({ ...item, status: exercise.status }));
        notify({ type: "error", code: result.error });
      }
    },
    [notify, open, patchExercise],
  );

  const swap = useCallback(
    async (exerciseId: string, newExerciseId: string): Promise<boolean> => {
      const result = await call(() =>
        swapExerciseAction({ sessionExerciseId: exerciseId, exerciseId: newExerciseId, locale }),
      );
      if (!result.ok) {
        notify({ type: "error", code: result.error });
        return false;
      }
      patchExercise(exerciseId, () => result.exercise);
      notify({ type: "swapped", exercise: result.exercise });
      return true;
    },
    [locale, notify, patchExercise],
  );

  const saveNotes = useCallback(
    async (exerciseId: string, notes: string): Promise<boolean> => {
      const result = await call(() => saveNotesAction({ sessionExerciseId: exerciseId, notes }));
      if (!result.ok) {
        notify({ type: "error", code: result.error });
        return false;
      }
      patchExercise(exerciseId, (exercise) => ({ ...exercise, notes: notes.trim() }));
      return true;
    },
    [notify, patchExercise],
  );

  /** Ends the workout. Resolves to whether it was saved as completed, or null on failure. */
  const finish = useCallback(async (): Promise<boolean | null> => {
    setFinishing(true);
    const result = await call(() => finishWorkoutAction({ sessionId: view.id }));
    if (!result.ok) {
      setFinishing(false);
      notify({ type: "error", code: result.error });
      return null;
    }
    try {
      window.localStorage.removeItem(storageKey(view.id));
    } catch {
      // Nothing to clean up if storage is blocked.
    }
    return result.completed;
  }, [notify, view.id]);

  return {
    exercises,
    openId,
    open,
    finishing,
    saveSet,
    calibrate,
    giveFeedback,
    addSet,
    skip,
    swap,
    saveNotes,
    finish,
    isComplete: isExerciseComplete,
  };
}

export type Workout = ReturnType<typeof useWorkout>;
