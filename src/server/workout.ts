import "server-only";
import { isTimedExercise, type MovementPattern, type Muscle } from "@/lib/exercise-options";
import {
  alternativesFor as engineAlternatives,
  prescribe,
  type EngineProfile,
} from "@/lib/program-engine";
import { dateFromDb, dateToDb } from "@/lib/schedule";
import { E1RM_WINDOW_DAYS } from "@/lib/weight-engine/config";
import {
  adjustAfterSet,
  epley,
  exerciseProfile,
  type Effort,
  type Reason,
  type ReasonCode,
  type SetAdjustment,
} from "@/lib/weight-engine";
import {
  COOLDOWN_VARIANTS,
  cooldownGroup,
  goalReps,
  type ReasonData,
  type WorkoutAlternative,
  type WorkoutExercise,
  type WorkoutView,
} from "@/lib/workout";
import { loadSettingsOf, suggestWeights, type Suggestion } from "@/server/coach";
import { db } from "@/server/db";
import { getEngineExercises, getExerciseIndex } from "@/server/queries/exercises";
import type { PlanDayView } from "@/server/queries/plan";
import type { UserProfile } from "@/server/queries/profile";

/** A session left open longer than this is closed and no longer resumed. */
export const RESUME_WINDOW_HOURS = 12;
const ALTERNATIVES_SHOWN = 6;

const resumeCutoff = (now: Date) => new Date(now.getTime() - RESUME_WINDOW_HOURS * 3_600_000);

const exerciseSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAr: true,
  equipment: true,
  difficulty: true,
  isCompound: true,
  movementPattern: true,
  primaryMuscles: true,
  secondaryMuscles: true,
  contraindications: true,
  requirements: true,
  instructionsEn: true,
  instructionsAr: true,
  mistakesEn: true,
  mistakesAr: true,
  breathingEn: true,
  breathingAr: true,
  media: { orderBy: { priority: "desc" }, select: { kind: true, urls: true } },
} as const;

const sessionExerciseSelect = {
  id: true,
  order: true,
  status: true,
  targetSets: true,
  repMin: true,
  repMax: true,
  restSeconds: true,
  suggestedWeightKg: true,
  reasonCode: true,
  reasonData: true,
  calibration: true,
  feedback: true,
  notes: true,
  swappedFromId: true,
  exercise: { select: exerciseSelect },
  sets: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      kind: true,
      targetReps: true,
      weightKg: true,
      reps: true,
      completedAt: true,
      isPr: true,
    },
  },
} as const;

type SessionExerciseRow = NonNullable<
  Awaited<ReturnType<typeof readSessionExercise>>
>;

function readSessionExercise(id: string, userId: string) {
  return db.sessionExercise.findFirst({
    where: { id, session: { userId, status: "IN_PROGRESS" } },
    select: {
      ...sessionExerciseSelect,
      session: {
        select: {
          id: true,
          date: true,
          exercises: { select: { exercise: { select: { slug: true } } } },
        },
      },
    },
  });
}

/** The answers the user's current plan was built from, used to pick safe swaps. */
async function planInputs(userId: string): Promise<EngineProfile | null> {
  const plan = await db.plan.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { inputs: true },
  });
  return (plan?.inputs as EngineProfile | undefined) ?? null;
}

/** Swaps for each exercise that pass the user's equipment, level and health filters. */
async function alternativesBySlug(
  userId: string,
  slugs: readonly string[],
  inSession: readonly string[],
): Promise<Map<string, WorkoutAlternative[]>> {
  const result = new Map<string, WorkoutAlternative[]>();
  const [inputs, engineExercises, index] = await Promise.all([
    planInputs(userId),
    getEngineExercises(),
    getExerciseIndex(),
  ]);
  if (!inputs) return result;

  const summaries = new Map(index.map((exercise) => [exercise.slug, exercise]));
  const ids = new Map(engineExercises.map((exercise) => [exercise.slug, exercise.id]));
  for (const slug of slugs) {
    const swaps = engineAlternatives(slug, inputs, engineExercises, inSession, ALTERNATIVES_SHOWN);
    result.set(
      slug,
      swaps.flatMap((swap) => {
        const summary = summaries.get(swap.slug);
        const exerciseId = ids.get(swap.slug);
        if (!summary || !exerciseId) return [];
        return [
          {
            exerciseId,
            slug: swap.slug,
            nameEn: summary.nameEn,
            nameAr: summary.nameAr,
            equipment: summary.equipment,
            thumb: summary.thumb,
          },
        ];
      }),
    );
  }
  return result;
}

function toWorkoutExercise(
  row: Omit<SessionExerciseRow, "session">,
  locale: string,
  alternatives: WorkoutAlternative[],
): WorkoutExercise {
  const { exercise } = row;
  const data = (row.reasonData ?? {}) as Partial<ReasonData>;
  const arabic = locale === "ar";
  const reason: Reason = {
    code: row.reasonCode as ReasonCode,
    fromKg: data.fromKg,
    toKg: data.toKg,
    reps: data.reps,
  };

  return {
    id: row.id,
    exerciseId: exercise.id,
    slug: exercise.slug,
    nameEn: exercise.nameEn,
    nameAr: exercise.nameAr,
    equipment: exercise.equipment,
    loadType: exerciseProfile({
      ...exercise,
      movementPattern: exercise.movementPattern as MovementPattern | null,
    }).loadType,
    timed: isTimedExercise(exercise.slug),
    primaryMuscles: exercise.primaryMuscles as Muscle[],
    secondaryMuscles: exercise.secondaryMuscles as Muscle[],
    media: exercise.media,
    thumb: exercise.media.find((item) => item.kind === "FRAME_SEQUENCE")?.urls[0] ?? null,
    // Arabic text exists for the curated set; anything else falls back to English.
    cues:
      arabic && exercise.instructionsAr.length > 0 ? exercise.instructionsAr : exercise.instructionsEn,
    mistakes: arabic && exercise.mistakesAr.length > 0 ? exercise.mistakesAr : exercise.mistakesEn,
    breathing: (arabic && exercise.breathingAr) || exercise.breathingEn,
    status: row.status,
    targetSets: row.targetSets,
    repMin: row.repMin,
    repMax: row.repMax,
    restSeconds: row.restSeconds,
    suggestedWeightKg: row.suggestedWeightKg,
    reason,
    variant: data.variant ?? 0,
    calibration: row.calibration,
    deload: data.deload ?? false,
    lastTime: data.lastTime ?? null,
    calibrationEffort: data.calibrationEffort ?? null,
    feedback: row.feedback,
    notes: row.notes ?? "",
    swapped: row.swappedFromId !== null,
    sets: row.sets.map((set) => ({
      id: set.id,
      order: set.order,
      kind: set.kind,
      targetReps: set.targetReps,
      weightKg: set.weightKg,
      reps: set.reps,
      done: set.completedAt !== null,
      isPr: set.isPr,
    })),
    alternatives,
  };
}

/** The workout in progress, or null. Callers pass the signed-in user's own data. */
export async function getActiveWorkout(
  userId: string,
  profile: UserProfile,
  locale: string,
  now: Date = new Date(),
): Promise<WorkoutView | null> {
  const session = await db.workoutSession.findFirst({
    where: { userId, status: "IN_PROGRESS", startedAt: { gte: resumeCutoff(now) } },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      dayType: true,
      startedAt: true,
      exercises: { orderBy: { order: "asc" }, select: sessionExerciseSelect },
    },
  });
  if (!session) return null;

  const slugs = session.exercises.map((row) => row.exercise.slug);
  const alternatives = await alternativesBySlug(userId, slugs, slugs);

  return {
    id: session.id,
    dayType: session.dayType,
    startedAt: session.startedAt.toISOString(),
    unitSystem: profile.unitSystem,
    needsClearance: profile.needsClearance,
    exercises: session.exercises.map((row) =>
      toWorkoutExercise(row, locale, alternatives.get(row.exercise.slug) ?? []),
    ),
  };
}

function reasonDataOf(suggestion: Suggestion): ReasonData {
  return {
    fromKg: suggestion.reason.fromKg,
    toKg: suggestion.reason.toKg,
    reps: suggestion.reason.reps,
    variant: suggestion.variant,
    deload: suggestion.deload,
    lastTime: suggestion.lastTime,
  };
}

/** Set rows for one exercise: the warm-up ramp, then the working sets. */
function setRows(userId: string, exerciseId: string, suggestion: Suggestion, sets: number) {
  const warmups = suggestion.warmups.map((warmup, order) => ({
    userId,
    exerciseId,
    order,
    kind: "WARMUP" as const,
    targetReps: warmup.reps,
    weightKg: warmup.weightKg,
  }));
  const targetReps = goalReps(suggestion);
  const working = Array.from({ length: sets }, (_, index) => ({
    userId,
    exerciseId,
    order: warmups.length + index,
    kind: "WORKING" as const,
    targetReps,
    weightKg: suggestion.weightKg,
  }));
  return [...warmups, ...working];
}

/**
 * Starts a workout from a plan day and returns its id. The session copies
 * the day's exercises and today's suggestions, so later plan changes never
 * rewrite it. An unfinished recent session is returned instead of a second
 * one being opened.
 */
export async function startSession(
  userId: string,
  profile: UserProfile,
  day: PlanDayView,
  date: string,
  now: Date = new Date(),
): Promise<string> {
  await closeStaleSessions(userId, now);
  const open = await db.workoutSession.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (open) return open.id;

  const suggestions = await suggestWeights(userId, profile, day.exercises, date, now);
  const session = await db.workoutSession.create({
    data: {
      userId,
      planDayId: day.id,
      dayType: day.type,
      date: dateToDb(date),
      startedAt: now,
      exercises: {
        create: day.exercises.map((exercise, order) => {
          const suggestion = suggestions.get(exercise.exerciseId)!;
          return {
            order,
            exerciseId: exercise.exerciseId,
            targetSets: exercise.sets,
            repMin: exercise.repMin,
            repMax: exercise.repMax,
            restSeconds: exercise.restSeconds,
            suggestedWeightKg: suggestion.weightKg,
            reasonCode: suggestion.reason.code,
            reasonData: reasonDataOf(suggestion),
            calibration: suggestion.calibration,
            sets: { create: setRows(userId, exercise.exerciseId, suggestion, exercise.sets) },
          };
        }),
      },
    },
    select: { id: true },
  });
  return session.id;
}

/** Recomputes a user's records for one exercise from their logged sets. */
export async function refreshStat(userId: string, exerciseId: string, now: Date = new Date()) {
  const done = { userId, exerciseId, kind: "WORKING" as const, completedAt: { not: null } };
  const cutoff = new Date(now.getTime() - E1RM_WINDOW_DAYS * 86_400_000);

  const [all, recent, best, sessions] = await Promise.all([
    db.setLog.aggregate({ where: done, _max: { e1rmKg: true, weightKg: true } }),
    db.setLog.aggregate({
      where: { ...done, completedAt: { gte: cutoff } },
      _max: { e1rmKg: true },
    }),
    db.setLog.findFirst({
      where: { ...done, e1rmKg: { not: null } },
      orderBy: [{ e1rmKg: "desc" }, { completedAt: "asc" }],
      select: { completedAt: true },
    }),
    db.sessionExercise.count({
      where: {
        exerciseId,
        session: { userId, status: "COMPLETED" },
        sets: { some: { kind: "WORKING", completedAt: { not: null } } },
      },
    }),
  ]);

  const data = {
    e1rmKg: recent._max.e1rmKg ?? all._max.e1rmKg,
    bestE1rmKg: all._max.e1rmKg,
    bestE1rmAt: best?.completedAt ?? null,
    maxWeightKg: all._max.weightKg,
    sessions,
  };
  await db.exerciseStat.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: { userId, exerciseId, ...data },
    update: data,
  });
}

export type LogSetResult =
  | { ok: false }
  | { ok: true; isPr: boolean; adjustment: SetAdjustment | null };

/**
 * Saves a set row. `done` checks it off (or unchecks it). Checking off a
 * working set that fell under the range lowers the sets that are left.
 */
export async function logSet(
  userId: string,
  profile: UserProfile,
  input: {
    setId: string;
    weightKg: number | null;
    reps: number | null;
    done: boolean;
    /** Give the same weight to the open sets of this kind that come after. */
    carry?: boolean;
  },
  now: Date = new Date(),
): Promise<LogSetResult> {
  const set = await db.setLog.findFirst({
    where: {
      id: input.setId,
      userId,
      sessionExercise: { session: { userId, status: "IN_PROGRESS" } },
    },
    select: {
      id: true,
      kind: true,
      order: true,
      exerciseId: true,
      sessionExerciseId: true,
      sessionExercise: {
        select: {
          repMin: true,
          repMax: true,
          exercise: {
            select: { slug: true, equipment: true, isCompound: true, movementPattern: true },
          },
        },
      },
    },
  });
  if (!set) return { ok: false };
  if (input.done && input.reps === null) return { ok: false };

  const exercise = {
    ...set.sessionExercise.exercise,
    movementPattern: set.sessionExercise.exercise.movementPattern as MovementPattern | null,
  };
  const { loadType } = exerciseProfile(exercise);
  const weightKg = loadType === "bodyweight" ? null : input.weightKg;
  const counts = input.done && set.kind === "WORKING";
  const e1rmKg =
    counts && weightKg && input.reps && !isTimedExercise(exercise.slug)
      ? Math.round(epley(weightKg, input.reps) * 100) / 100
      : null;

  // A record needs an earlier session to beat: the first session of an
  // exercise only sets the mark. It must also beat this session's other sets.
  let isPr = false;
  if (e1rmKg !== null) {
    const others = {
      userId,
      exerciseId: set.exerciseId,
      kind: "WORKING" as const,
      completedAt: { not: null },
      id: { not: set.id },
    };
    const [before, all] = await Promise.all([
      db.setLog.aggregate({
        where: { ...others, sessionExerciseId: { not: set.sessionExerciseId } },
        _max: { e1rmKg: true },
      }),
      db.setLog.aggregate({ where: others, _max: { e1rmKg: true } }),
    ]);
    isPr = before._max.e1rmKg !== null && e1rmKg > (all._max.e1rmKg ?? 0) + 0.01;
  }

  await db.setLog.update({
    where: { id: set.id },
    data: {
      weightKg,
      reps: input.reps,
      completedAt: input.done ? now : null,
      e1rmKg,
      isPr,
    },
  });
  // One query for the sets that follow, so a page closed right after typing
  // a weight cannot leave them on the old one.
  if (input.carry && !input.done && loadType !== "bodyweight") {
    await db.setLog.updateMany({
      where: {
        sessionExerciseId: set.sessionExerciseId,
        kind: set.kind,
        completedAt: null,
        order: { gt: set.order },
      },
      data: { weightKg },
    });
  }
  if (set.kind === "WORKING") await refreshStat(userId, set.exerciseId, now);

  let adjustment: SetAdjustment | null = null;
  if (counts && loadType !== "bodyweight" && weightKg !== null && input.reps !== null) {
    const result = adjustAfterSet({
      weightKg,
      reps: input.reps,
      target: set.sessionExercise,
      effort: null,
      calibration: false,
      loadType,
      settings: loadSettingsOf(profile),
      needsClearance: profile.needsClearance,
    });
    if (result.code !== "keep") {
      adjustment = result;
      await db.setLog.updateMany({
        where: {
          sessionExerciseId: set.sessionExerciseId,
          kind: "WORKING",
          completedAt: null,
          order: { gt: set.order },
        },
        data: { weightKg: result.weightKg },
      });
    }
  }
  return { ok: true, isPr, adjustment };
}

/**
 * Records how the first set of a calibration exercise felt and moves the
 * remaining sets to match. Returns null when there is nothing to act on.
 */
export async function calibrate(
  userId: string,
  profile: UserProfile,
  sessionExerciseId: string,
  effort: Effort,
): Promise<SetAdjustment | null> {
  const row = await readSessionExercise(sessionExerciseId, userId);
  if (!row || !row.calibration) return null;

  const first = row.sets.find((set) => set.kind === "WORKING" && set.completedAt !== null);
  const { loadType } = exerciseProfile({
    ...row.exercise,
    movementPattern: row.exercise.movementPattern as MovementPattern | null,
  });
  if (!first || first.weightKg === null || first.reps === null || loadType === "bodyweight") {
    return null;
  }

  const adjustment = adjustAfterSet({
    weightKg: first.weightKg,
    reps: first.reps,
    target: row,
    effort,
    calibration: true,
    loadType,
    settings: loadSettingsOf(profile),
    needsClearance: profile.needsClearance,
  });

  const data = { ...((row.reasonData ?? {}) as object), calibrationEffort: effort };
  await db.$transaction([
    db.sessionExercise.update({ where: { id: row.id }, data: { reasonData: data } }),
    ...(adjustment.code === "keep"
      ? []
      : [
          db.setLog.updateMany({
            where: { sessionExerciseId: row.id, kind: "WORKING", completedAt: null },
            data: { weightKg: adjustment.weightKg },
          }),
        ]),
  ]);
  return adjustment;
}

/** Adds one more working set, copying the last one. Returns the new row. */
export async function addSet(userId: string, sessionExerciseId: string) {
  const row = await readSessionExercise(sessionExerciseId, userId);
  if (!row || row.sets.length >= 20) return null;

  const last = [...row.sets].reverse().find((set) => set.kind === "WORKING");
  const set = await db.setLog.create({
    data: {
      sessionExerciseId: row.id,
      userId,
      exerciseId: row.exercise.id,
      order: (row.sets[row.sets.length - 1]?.order ?? -1) + 1,
      kind: "WORKING",
      targetReps: last?.reps ?? last?.targetReps ?? row.repMin,
      weightKg: last?.weightKg ?? row.suggestedWeightKg,
    },
    select: { id: true, order: true, kind: true, targetReps: true, weightKg: true },
  });
  return { ...set, reps: null, done: false, isPr: false };
}

export type SwapResult =
  | { ok: true; exercise: WorkoutExercise }
  | { ok: false; error: "not_found" | "has_sets" | "not_allowed" };

type RangeKind = "timed" | "bodyweight" | "loaded";

/**
 * Replaces an exercise that has no logged sets with one of its listed
 * alternatives and works out a fresh suggestion for it.
 */
export async function swapExercise(
  userId: string,
  profile: UserProfile,
  sessionExerciseId: string,
  newExerciseId: string,
  locale: string,
  now: Date = new Date(),
): Promise<SwapResult> {
  const row = await readSessionExercise(sessionExerciseId, userId);
  if (!row) return { ok: false, error: "not_found" };
  if (row.sets.some((set) => set.kind === "WORKING" && set.completedAt !== null)) {
    return { ok: false, error: "has_sets" };
  }

  const inSession = row.session.exercises.map((item) => item.exercise.slug);
  const allowed = (await alternativesBySlug(userId, [row.exercise.slug], inSession)).get(
    row.exercise.slug,
  );
  if (!allowed?.some((option) => option.exerciseId === newExerciseId)) {
    return { ok: false, error: "not_allowed" };
  }
  const next = await db.exercise.findUnique({ where: { id: newExerciseId }, select: exerciseSelect });
  if (!next) return { ok: false, error: "not_allowed" };

  const typed = <T extends { movementPattern: string | null; primaryMuscles: string[] }>(e: T) => ({
    ...e,
    movementPattern: e.movementPattern as MovementPattern | null,
    primaryMuscles: e.primaryMuscles as Muscle[],
  });
  const kindOf = (exercise: ReturnType<typeof typed<typeof next>>): RangeKind =>
    isTimedExercise(exercise.slug)
      ? "timed"
      : exerciseProfile(exercise).loadType === "bodyweight"
        ? "bodyweight"
        : "loaded";

  // Reps for a plank make no sense for a crunch: when the kind of exercise
  // changes, the rep range is worked out again. Sets and rest stay.
  let range = { repMin: row.repMin, repMax: row.repMax };
  if (kindOf(typed(next)) !== kindOf(typed(row.exercise))) {
    const inputs = await planInputs(userId);
    const role =
      next.movementPattern === "core" ? "core" : next.isCompound ? "compound" : "accessory";
    const fresh = prescribe(typed(next), role, {
      goal: inputs?.goal ?? profile.goal,
      level: inputs?.level ?? profile.level,
      needsClearance: profile.needsClearance,
    });
    range = { repMin: fresh.repMin, repMax: fresh.repMax };
  }

  const hadWarmups = row.sets.some((set) => set.kind === "WARMUP");
  const suggestion = (
    await suggestWeights(
      userId,
      profile,
      [{ ...typed(next), exerciseId: next.id, sets: row.targetSets, ...range }],
      dateFromDb(row.session.date),
      now,
      hadWarmups ? next.id : null,
    )
  ).get(next.id)!;

  await db.$transaction([
    db.setLog.deleteMany({ where: { sessionExerciseId: row.id } }),
    db.sessionExercise.update({
      where: { id: row.id },
      data: {
        exerciseId: next.id,
        // Keeps pointing at the planned exercise through repeated swaps.
        swappedFromId: row.swappedFromId ?? row.exercise.id,
        status: "PENDING",
        feedback: null,
        ...range,
        suggestedWeightKg: suggestion.weightKg,
        reasonCode: suggestion.reason.code,
        reasonData: reasonDataOf(suggestion),
        calibration: suggestion.calibration,
        sets: { create: setRows(userId, next.id, suggestion, row.targetSets) },
      },
    }),
  ]);

  const fresh = await readSessionExercise(row.id, userId);
  if (!fresh) return { ok: false, error: "not_found" };
  const slugs = fresh.session.exercises.map((item) => item.exercise.slug);
  const alternatives = await alternativesBySlug(userId, [fresh.exercise.slug], slugs);
  return {
    ok: true,
    exercise: toWorkoutExercise(fresh, locale, alternatives.get(fresh.exercise.slug) ?? []),
  };
}

/** Saves a small change to an exercise of the user's workout in progress. */
export async function updateSessionExercise(
  userId: string,
  sessionExerciseId: string,
  data: { status?: "PENDING" | "DONE" | "SKIPPED"; feedback?: Effort; notes?: string | null },
): Promise<boolean> {
  const result = await db.sessionExercise.updateMany({
    where: { id: sessionExerciseId, session: { userId, status: "IN_PROGRESS" } },
    data,
  });
  return result.count === 1;
}

/**
 * Closes a workout. With at least one working set done it is completed:
 * duration, volume and per-exercise records are saved and unused set rows
 * are removed. With none it is abandoned and leaves no trace in history.
 */
export async function finalizeSession(
  userId: string,
  sessionId: string,
  finishedAt: Date = new Date(),
  needsClearance = false,
): Promise<"COMPLETED" | "ABANDONED" | null> {
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, userId, status: "IN_PROGRESS" },
    select: {
      id: true,
      startedAt: true,
      dayType: true,
      exercises: {
        select: {
          id: true,
          exerciseId: true,
          status: true,
          sets: { select: { kind: true, weightKg: true, reps: true, completedAt: true } },
        },
      },
    },
  });
  if (!session) return null;

  const doneSets = (exercise: (typeof session.exercises)[number]) =>
    exercise.sets.filter((set) => set.kind === "WORKING" && set.completedAt !== null);
  const volumeOf = (exercise: (typeof session.exercises)[number]) =>
    doneSets(exercise).reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);

  const worked = session.exercises.filter((exercise) => doneSets(exercise).length > 0);
  if (worked.length === 0) {
    await db.workoutSession.update({
      where: { id: session.id },
      data: { status: "ABANDONED", finishedAt },
    });
    return "ABANDONED";
  }

  const idle = session.exercises.filter((exercise) => doneSets(exercise).length === 0);
  const totalVolumeKg = Math.round(worked.reduce((sum, e) => sum + volumeOf(e), 0) * 10) / 10;
  await db.$transaction([
    db.setLog.deleteMany({
      where: { sessionExercise: { sessionId: session.id }, completedAt: null },
    }),
    db.sessionExercise.updateMany({
      where: { id: { in: worked.map((exercise) => exercise.id) } },
      data: { status: "DONE" },
    }),
    db.sessionExercise.updateMany({
      where: { id: { in: idle.map((exercise) => exercise.id) } },
      data: { status: "SKIPPED" },
    }),
    db.workoutSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        finishedAt,
        durationSeconds: Math.max(
          0,
          Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 1000),
        ),
        totalVolumeKg,
        // Picked once, so the finish screen shows the same message on reload.
        cooldownKey: `${cooldownGroup(session.dayType, needsClearance)}.${Math.floor(Math.random() * COOLDOWN_VARIANTS)}`,
      },
    }),
  ]);

  // Records per exercise, now that the session counts as completed.
  for (const exercise of worked) {
    await refreshStat(userId, exercise.exerciseId, finishedAt);
    const volume = Math.round(volumeOf(exercise) * 10) / 10;
    await db.exerciseStat.updateMany({
      where: {
        userId,
        exerciseId: exercise.exerciseId,
        OR: [{ maxSessionVolumeKg: null }, { maxSessionVolumeKg: { lt: volume } }],
      },
      data: { maxSessionVolumeKg: volume },
    });
  }
  return "COMPLETED";
}

/**
 * Closes workouts that were left open past the resume window, at the time
 * of their last logged set.
 */
export async function closeStaleSessions(userId: string, now: Date = new Date()) {
  const stale = await db.workoutSession.findMany({
    where: { userId, status: "IN_PROGRESS", startedAt: { lt: resumeCutoff(now) } },
    select: {
      id: true,
      startedAt: true,
      exercises: {
        select: { sets: { where: { completedAt: { not: null } }, select: { completedAt: true } } },
      },
    },
  });
  for (const session of stale) {
    const times = session.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => set.completedAt!.getTime()),
    );
    const end = times.length > 0 ? new Date(Math.max(...times)) : session.startedAt;
    await finalizeSession(userId, session.id, end);
  }
}
