import "server-only";
import { isTimedExercise } from "@/lib/exercise-options";
import type { DayType } from "@/lib/program-engine";
import { dateFromDb } from "@/lib/schedule";
import { db } from "@/server/db";

export type SummaryRecord = {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  /** The record set of this workout: the one with the highest estimated max. */
  weightKg: number;
  reps: number;
  e1rmKg: number;
};

export type SummaryExercise = {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  timed: boolean;
  /** Completed working sets, in order. */
  sets: { weightKg: number | null; reps: number }[];
};

export type WorkoutSummary = {
  id: string;
  date: string;
  dayType: DayType;
  durationSeconds: number;
  totalVolumeKg: number;
  setCount: number;
  cooldownKey: string | null;
  exercises: SummaryExercise[];
  records: SummaryRecord[];
};

/** A completed workout of the signed-in user, or null. */
export async function getWorkoutSummary(
  userId: string,
  sessionId: string,
): Promise<WorkoutSummary | null> {
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, userId, status: "COMPLETED" },
    select: {
      id: true,
      date: true,
      dayType: true,
      durationSeconds: true,
      totalVolumeKg: true,
      cooldownKey: true,
      exercises: {
        where: { status: "DONE" },
        orderBy: { order: "asc" },
        select: {
          exercise: { select: { slug: true, nameEn: true, nameAr: true } },
          sets: {
            where: { kind: "WORKING", completedAt: { not: null } },
            orderBy: { order: "asc" },
            select: { weightKg: true, reps: true, e1rmKg: true, isPr: true },
          },
        },
      },
    },
  });
  if (!session) return null;

  const records: SummaryRecord[] = [];
  for (const { exercise, sets } of session.exercises) {
    const best = sets
      .filter((set) => set.isPr && set.weightKg !== null && set.e1rmKg !== null)
      .sort((a, b) => b.e1rmKg! - a.e1rmKg!)[0];
    if (best) {
      records.push({
        ...exercise,
        weightKg: best.weightKg!,
        reps: best.reps ?? 0,
        e1rmKg: best.e1rmKg!,
      });
    }
  }

  return {
    id: session.id,
    date: dateFromDb(session.date),
    dayType: session.dayType,
    durationSeconds: session.durationSeconds ?? 0,
    totalVolumeKg: session.totalVolumeKg ?? 0,
    setCount: session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0),
    cooldownKey: session.cooldownKey,
    exercises: session.exercises.map(({ exercise, sets }) => ({
      ...exercise,
      timed: isTimedExercise(exercise.slug),
      sets: sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps ?? 0 })),
    })),
    records,
  };
}
