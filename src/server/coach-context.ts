import "server-only";
import { buildCoachContext, COACH_LIMITS } from "@/lib/coach-context";
import { dateFromDb } from "@/lib/schedule";
import { db } from "@/server/db";
import { getActivePlan } from "@/server/queries/plan";
import { getUserProfile } from "@/server/queries/profile";
import { getTrackedExercises } from "@/server/queries/stats";
import { getTodayView } from "@/server/queries/today";

/**
 * A text briefing about the signed-in user: profile, plan, today's
 * suggestions, recent lifts and estimated maxes. Null before onboarding.
 * Unused for now (the chat coach it was written for is cancelled). Callers
 * pass the id of the signed-in user only.
 */
export async function getCoachContext(userId: string, now: Date = new Date()): Promise<string | null> {
  const [profile, plan] = await Promise.all([getUserProfile(userId), getActivePlan(userId)]);
  if (!profile || !plan) return null;

  const [today, lifts, sessions] = await Promise.all([
    getTodayView(userId, profile, plan, now),
    getTrackedExercises(userId),
    db.workoutSession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { startedAt: "desc" },
      take: COACH_LIMITS.recentWorkouts,
      select: {
        date: true,
        dayType: true,
        exercises: {
          where: { status: "DONE" },
          orderBy: { order: "asc" },
          select: {
            exercise: { select: { nameEn: true } },
            sets: {
              where: { kind: "WORKING", completedAt: { not: null } },
              orderBy: { order: "asc" },
              select: { weightKg: true, reps: true },
            },
          },
        },
      },
    }),
  ]);

  return buildCoachContext({
    date: today.date,
    profile,
    plan: { split: plan.split, days: plan.days.map(({ weekday, type }) => ({ weekday, type })) },
    streak: today.streak,
    today:
      today.day && today.exercises.length > 0
        ? {
            dayType: today.day.type,
            exercises: today.exercises.map((exercise) => ({
              name: exercise.nameEn,
              sets: exercise.sets,
              repMin: exercise.repMin,
              repMax: exercise.repMax,
              suggestedKg: exercise.suggestion.weightKg,
              reason: exercise.suggestion.reason.code,
            })),
          }
        : null,
    recent: sessions.map((session) => ({
      date: dateFromDb(session.date),
      dayType: session.dayType,
      exercises: session.exercises.map(({ exercise, sets }) => ({
        name: exercise.nameEn,
        sets: sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps ?? 0 })),
      })),
    })),
    lifts: lifts.map((lift) => ({
      name: lift.nameEn,
      e1rmKg: lift.e1rmKg,
      bestE1rmKg: lift.bestE1rmKg,
      sessions: lift.sessions,
    })),
  });
}
