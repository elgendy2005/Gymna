import "server-only";
import type { ExerciseEquipment, MovementPattern } from "@/lib/exercise-options";
import type { BaselineLift } from "@/lib/profile-options";
import { pickVariant } from "@/lib/schedule";
import {
  ANCHOR_EXERCISES,
  exerciseProfile,
  recommend,
  reviewSession,
  type KnownLifts,
  type Lifter,
  type LoadSettings,
  type PastSession,
  type Recommendation,
} from "@/lib/weight-engine";
import { db } from "@/server/db";
import type { UserProfile } from "@/server/queries/profile";

/** Past sessions of one exercise the engine looks at. */
const HISTORY_SESSIONS = 8;
/** Wordings per reason in the message files. */
export const REASON_VARIANTS = 3;

export type SuggestItem = {
  exerciseId: string;
  slug: string;
  equipment: ExerciseEquipment;
  isCompound: boolean;
  movementPattern: MovementPattern | null;
  sets: number;
  repMin: number;
  repMax: number;
};

export type LastTime = { weightKg: number | null; reps: number[] };

export type Suggestion = Recommendation & {
  /** Which wording of the reason to show. Stable for one exercise on one day. */
  variant: number;
  /** The main weight and reps of the latest session, or null the first time. */
  lastTime: LastTime | null;
};

export function lifterOf(profile: UserProfile): Lifter {
  return {
    bodyWeightKg: profile.weightKg,
    gender: profile.gender,
    age: profile.age,
    level: profile.level,
    experience: profile.experience,
    needsClearance: profile.needsClearance,
  };
}

export function loadSettingsOf(profile: UserProfile): LoadSettings {
  return {
    unitSystem: profile.unitSystem,
    dumbbellStepKg: profile.dumbbellStepKg,
    machineStepKg: profile.machineStepKg,
  };
}

/** Completed sessions of each exercise, newest first. */
export async function loadHistory(
  userId: string,
  exerciseIds: readonly string[],
): Promise<Map<string, PastSession[]>> {
  const history = new Map<string, PastSession[]>();
  if (exerciseIds.length === 0) return history;

  const rows = await db.sessionExercise.findMany({
    where: {
      exerciseId: { in: [...exerciseIds] },
      session: { userId, status: "COMPLETED" },
      sets: { some: { kind: "WORKING", completedAt: { not: null } } },
    },
    orderBy: { session: { startedAt: "desc" } },
    take: exerciseIds.length * HISTORY_SESSIONS,
    select: {
      exerciseId: true,
      targetSets: true,
      repMin: true,
      repMax: true,
      feedback: true,
      session: { select: { startedAt: true } },
      sets: {
        where: { kind: "WORKING", completedAt: { not: null } },
        orderBy: { order: "asc" },
        select: { weightKg: true, reps: true },
      },
    },
  });

  for (const row of rows) {
    const sessions = history.get(row.exerciseId) ?? [];
    if (sessions.length >= HISTORY_SESSIONS) continue;
    sessions.push({
      date: row.session.startedAt.toISOString(),
      targetSets: row.targetSets,
      repMin: row.repMin,
      repMax: row.repMax,
      feedback: row.feedback,
      sets: row.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps ?? 0 })),
    });
    history.set(row.exerciseId, sessions);
  }
  return history;
}

/** Strength on the reference lifts: onboarding answers plus anything logged since. */
export async function loadKnownLifts(userId: string, profile: UserProfile): Promise<KnownLifts> {
  const lifts = Object.entries(ANCHOR_EXERCISES) as [BaselineLift, string][];
  const stats = await db.exerciseStat.findMany({
    where: { userId, e1rmKg: { not: null }, exercise: { slug: { in: lifts.map(([, slug]) => slug) } } },
    select: { e1rmKg: true, exercise: { select: { slug: true } } },
  });

  const known: Required<KnownLifts> = { baselines: {}, logged: {} };
  for (const baseline of profile.baselines) {
    known.baselines[baseline.lift] = { weightKg: baseline.weightKg, reps: baseline.reps };
  }
  for (const stat of stats) {
    const lift = lifts.find(([, slug]) => slug === stat.exercise.slug)?.[0];
    if (lift && stat.e1rmKg) known.logged[lift] = stat.e1rmKg;
  }
  return known;
}

/**
 * Weight, reps and reason for each exercise of a day, in order. `dayKey`
 * (the date) keeps the reason wording stable for the day. Callers pass the
 * id and profile of the signed-in user only.
 */
export async function suggestWeights(
  userId: string,
  profile: UserProfile,
  items: readonly SuggestItem[],
  dayKey: string,
  now: Date = new Date(),
): Promise<Map<string, Suggestion>> {
  const [history, known] = await Promise.all([
    loadHistory(
      userId,
      items.map((item) => item.exerciseId),
    ),
    loadKnownLifts(userId, profile),
  ]);
  const lifter = lifterOf(profile);
  const settings = loadSettingsOf(profile);

  // Warm-up sets go on the first loaded compound lift of the day.
  const firstCompound = items.find(
    (item) => item.isCompound && exerciseProfile(item).loadType !== "bodyweight",
  );

  const suggestions = new Map<string, Suggestion>();
  for (const item of items) {
    const past = history.get(item.exerciseId) ?? [];
    const recommendation = recommend({
      exercise: item,
      target: { sets: item.sets, repMin: item.repMin, repMax: item.repMax },
      lifter,
      settings,
      history: past,
      known,
      firstCompound: item === firstCompound,
      now,
    });
    const latest = past.map(reviewSession).find((review) => review !== null) ?? null;
    suggestions.set(item.exerciseId, {
      ...recommendation,
      variant: pickVariant(`${dayKey}:${item.exerciseId}`, REASON_VARIANTS),
      lastTime: latest ? { weightKg: latest.weightKg, reps: latest.reps } : null,
    });
  }
  return suggestions;
}
