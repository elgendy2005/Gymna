import "server-only";
import { isTimedExercise } from "@/lib/exercise-options";
import { dateFromDb } from "@/lib/schedule";
import { db } from "@/server/db";

/** Sessions shown in an exercise's chart and history. */
const HISTORY_SESSIONS = 30;

export type ExerciseSessionPoint = {
  /** The user's local date of the workout. */
  date: string;
  /** Best estimated one-rep max of the session, or null for bodyweight work. */
  e1rmKg: number | null;
  volumeKg: number;
  sets: { weightKg: number | null; reps: number; isPr: boolean }[];
};

export type ExerciseStats = {
  timed: boolean;
  bestE1rmKg: number | null;
  /** Local date of the best estimated max. */
  bestE1rmDate: string | null;
  maxWeightKg: number | null;
  maxSessionVolumeKg: number | null;
  sessions: number;
  /** Oldest first. */
  history: ExerciseSessionPoint[];
};

/** A user's records and recent history on one exercise, or null if never logged. */
export async function getExerciseStats(
  userId: string,
  slug: string,
): Promise<ExerciseStats | null> {
  const rows = await db.sessionExercise.findMany({
    where: {
      exercise: { slug },
      session: { userId, status: "COMPLETED" },
      sets: { some: { kind: "WORKING", completedAt: { not: null } } },
    },
    orderBy: { session: { startedAt: "desc" } },
    take: HISTORY_SESSIONS,
    select: {
      exerciseId: true,
      session: { select: { date: true } },
      sets: {
        where: { kind: "WORKING", completedAt: { not: null } },
        orderBy: { order: "asc" },
        select: { weightKg: true, reps: true, e1rmKg: true, isPr: true },
      },
    },
  });
  if (rows.length === 0) return null;

  const stat = await db.exerciseStat.findUnique({
    where: { userId_exerciseId: { userId, exerciseId: rows[0].exerciseId } },
  });

  const history = rows.reverse().map((row) => {
    const maxes = row.sets.flatMap((set) => (set.e1rmKg === null ? [] : [set.e1rmKg]));
    return {
      date: dateFromDb(row.session.date),
      e1rmKg: maxes.length > 0 ? Math.max(...maxes) : null,
      volumeKg:
        Math.round(row.sets.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0) * 10) /
        10,
      sets: row.sets.map((set) => ({
        weightKg: set.weightKg,
        reps: set.reps ?? 0,
        isPr: set.isPr,
      })),
    };
  });

  const bestPoint = history
    .filter((point) => point.e1rmKg !== null)
    .sort((a, b) => b.e1rmKg! - a.e1rmKg!)[0];

  return {
    timed: isTimedExercise(slug),
    bestE1rmKg: stat?.bestE1rmKg ?? bestPoint?.e1rmKg ?? null,
    bestE1rmDate: bestPoint?.date ?? null,
    maxWeightKg: stat?.maxWeightKg ?? null,
    maxSessionVolumeKg: stat?.maxSessionVolumeKg ?? null,
    sessions: stat?.sessions ?? history.length,
    history,
  };
}

export type TrackedExercise = {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  sessions: number;
  e1rmKg: number | null;
  bestE1rmKg: number | null;
  /** ISO timestamp of the best estimated max. */
  bestE1rmAt: string | null;
  maxWeightKg: number | null;
};

/** Every exercise the user has logged, most trained first. */
export async function getTrackedExercises(userId: string): Promise<TrackedExercise[]> {
  const stats = await db.exerciseStat.findMany({
    where: { userId, sessions: { gt: 0 } },
    orderBy: [{ sessions: "desc" }, { updatedAt: "desc" }],
    select: {
      sessions: true,
      e1rmKg: true,
      bestE1rmKg: true,
      bestE1rmAt: true,
      maxWeightKg: true,
      exercise: { select: { slug: true, nameEn: true, nameAr: true } },
    },
  });
  return stats.map(({ exercise, bestE1rmAt, ...stat }) => ({
    ...exercise,
    ...stat,
    bestE1rmAt: bestE1rmAt?.toISOString() ?? null,
  }));
}
