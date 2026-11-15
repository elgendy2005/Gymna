import "server-only";
import {
  STREAK_LOOKBACK_DAYS,
  addDays,
  buildWeek,
  computeStreak,
  dateFromDb,
  dateToDb,
  localDateTime,
  nextTrainingWeekday,
  pickToday,
  weekdayOf,
  type WeekDay,
} from "@/lib/schedule";
import { suggestWeights, type Suggestion } from "@/server/coach";
import { RESUME_WINDOW_HOURS } from "@/server/workout";
import { db } from "@/server/db";
import type { PlanDayView, PlanExerciseView, PlanView } from "@/server/queries/plan";
import type { UserProfile } from "@/server/queries/profile";

export type TodayExercise = PlanExerciseView & { suggestion: Suggestion };

export type TodayView = {
  date: string;
  /** Hour of the day (0-23) in the user's time zone, for the greeting. */
  hour: number;
  week: WeekDay[];
  streak: number;
  /**
   * - training: today's planned workout, not done yet
   * - makeup: a rest day with an earlier session of this week still open
   * - rest: a rest day with nothing to make up
   * - done: a workout was completed today
   */
  kind: "training" | "makeup" | "rest" | "done";
  /** The workout on offer (training, makeup) or the one planned for today (done). */
  day: PlanDayView | null;
  exercises: TodayExercise[];
  /** Weekday of the next planned workout, 0 = Saturday. */
  nextWeekday: number | null;
  /** A workout in progress that can be resumed. */
  activeSessionId: string | null;
  /** The workout completed today, for the summary link. */
  doneSessionId: string | null;
};

/** Completed workouts of the streak window, newest first. */
async function loadCompleted(userId: string, date: string) {
  const finished = await db.workoutSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
      date: { gte: dateToDb(addDays(date, -STREAK_LOOKBACK_DAYS)) },
    },
    orderBy: { startedAt: "desc" },
    select: { id: true, date: true, planDayId: true },
  });
  return finished.map((session) => ({
    id: session.id,
    date: dateFromDb(session.date),
    planDayId: session.planDayId,
  }));
}

/** The user's current streak and the weekday of their next planned workout. */
export async function getStreak(
  userId: string,
  profile: UserProfile,
  plan: PlanView,
  now: Date = new Date(),
): Promise<{ streak: number; nextWeekday: number | null }> {
  const { date } = localDateTime(now, profile.timezone);
  const completed = await loadCompleted(userId, date);
  const trainingDays = plan.days.map((day) => day.weekday);
  return {
    streak: computeStreak(
      date,
      trainingDays,
      completed.map((session) => session.date),
    ),
    nextWeekday: nextTrainingWeekday(weekdayOf(date), trainingDays),
  };
}

/** Everything the Today page shows. Callers pass the signed-in user's own data. */
export async function getTodayView(
  userId: string,
  profile: UserProfile,
  plan: PlanView,
  now: Date = new Date(),
): Promise<TodayView> {
  const { date, hour } = localDateTime(now, profile.timezone);

  const [completed, active, firstPlan] = await Promise.all([
    loadCompleted(userId, date),
    db.workoutSession.findFirst({
      where: {
        userId,
        status: "IN_PROGRESS",
        startedAt: { gte: new Date(now.getTime() - RESUME_WINDOW_HOURS * 3_600_000) },
      },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    }),
    db.plan.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  // Nothing is owed from before the user had a plan.
  const since = firstPlan ? localDateTime(firstPlan.createdAt, profile.timezone).date : date;

  const pick = pickToday(date, plan.days, completed, since);
  const kind = pick.kind === "rest" && pick.missed ? "makeup" : pick.kind;
  const day = pick.kind === "rest" ? pick.missed : pick.day;

  const offered = kind === "training" || kind === "makeup" ? (day?.exercises ?? []) : [];
  const suggestions = await suggestWeights(
    userId,
    profile,
    offered,
    date,
    now,
  );

  const trainingDays = plan.days.map((planDay) => planDay.weekday);
  return {
    date,
    hour,
    week: buildWeek(date, plan.days, completed, since),
    streak: computeStreak(
      date,
      trainingDays,
      completed.map((session) => session.date),
    ),
    kind,
    day,
    exercises: offered.map((exercise) => ({
      ...exercise,
      suggestion: suggestions.get(exercise.exerciseId)!,
    })),
    nextWeekday: nextTrainingWeekday(weekdayOf(date), trainingDays),
    activeSessionId: active?.id ?? null,
    doneSessionId: completed.find((session) => session.date === date)?.id ?? null,
  };
}
