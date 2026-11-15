// Calendar helpers for the training week. Dates are "YYYY-MM-DD" strings in
// the user's own time zone; weekday numbers start on Saturday (0) and end on
// Friday (6), like the rest of the app.

const DAY_MS = 86_400_000;

/** The calendar date and hour at `now` in a time zone. */
export function localDateTime(now: Date, timeZone: string): { date: string; hour: number } {
  const format = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

  let parts;
  try {
    parts = format(timeZone);
  } catch {
    // An unknown zone name must not take the page down.
    parts = format("Africa/Cairo");
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);
const fromUtc = (value: Date) => value.toISOString().slice(0, 10);

/** A date string as the UTC-midnight Date the database stores for it. */
export function dateToDb(date: string): Date {
  return toUtc(date);
}

/** The date string of a database DATE value. */
export function dateFromDb(value: Date): string {
  return fromUtc(value);
}

export function addDays(date: string, days: number): string {
  return fromUtc(new Date(toUtc(date).getTime() + days * DAY_MS));
}

/** 0 for Saturday through 6 for Friday. */
export function weekdayOf(date: string): number {
  // getUTCDay: Sunday is 0, Saturday is 6.
  return (toUtc(date).getUTCDay() + 1) % 7;
}

/** The seven dates, Saturday to Friday, of the week `date` falls in. */
export function weekOf(date: string): string[] {
  const start = addDays(date, -weekdayOf(date));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export type WeekDay = {
  date: string;
  weekday: number;
  isToday: boolean;
  /** A workout is planned for this weekday. */
  training: boolean;
  /** A workout was completed on this date. */
  done: boolean;
  /** A planned workout in the past that was neither done nor made up. */
  missed: boolean;
};

export type CompletedWorkout = { date: string; planDayId: string | null };
type ScheduledDay = { id: string; weekday: number };

/** True when this week's session for a plan day has been done, on its day or as a make-up. */
function covered(day: ScheduledDay, date: string, week: readonly string[], completed: readonly CompletedWorkout[]) {
  return completed.some(
    (workout) =>
      workout.date === date || (workout.planDayId === day.id && week.includes(workout.date)),
  );
}

/**
 * The current week, day by day, for the strip on the Today page. Days
 * before `since` (the day the user got their first plan) are never missed.
 */
export function buildWeek(
  today: string,
  planDays: readonly ScheduledDay[],
  completed: readonly CompletedWorkout[],
  since = "",
): WeekDay[] {
  const week = weekOf(today);
  return week.map((date, weekday) => {
    const planDay = planDays.find((day) => day.weekday === weekday);
    const done = completed.some((workout) => workout.date === date);
    return {
      date,
      weekday,
      isToday: date === today,
      training: Boolean(planDay),
      done,
      missed:
        Boolean(planDay) &&
        date < today &&
        date >= since &&
        !covered(planDay!, date, week, completed),
    };
  });
}

export type TodayPick<Day extends ScheduledDay> =
  /** A workout is planned for today and not done yet. */
  | { kind: "training"; day: Day }
  /** Today's workout is done. */
  | { kind: "done"; day: Day | null }
  /** A rest day. `missed` is an earlier session this week that can be made up today. */
  | { kind: "rest"; missed: Day | null };

/** What the Today page should offer. Sessions from before `since` are not owed. */
export function pickToday<Day extends ScheduledDay>(
  today: string,
  planDays: readonly Day[],
  completed: readonly CompletedWorkout[],
  since = "",
): TodayPick<Day> {
  const week = weekOf(today);
  const weekday = weekdayOf(today);
  const scheduled = planDays.find((day) => day.weekday === weekday) ?? null;

  if (completed.some((workout) => workout.date === today)) return { kind: "done", day: scheduled };
  if (scheduled) return { kind: "training", day: scheduled };

  // The most recent missed session of this week, if any.
  const missed = [...planDays]
    .filter((day) => day.weekday < weekday && week[day.weekday] >= since)
    .sort((a, b) => b.weekday - a.weekday)
    .find((day) => !covered(day, week[day.weekday], week, completed));
  return { kind: "rest", missed: missed ?? null };
}

/** The next training weekday after `weekday`, wrapping into next week. Null with no plan. */
export function nextTrainingWeekday(weekday: number, trainingDays: readonly number[]): number | null {
  if (trainingDays.length === 0) return null;
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = (weekday + offset) % 7;
    if (trainingDays.includes(candidate)) return candidate;
  }
  return null;
}

/** How far back the streak looks. */
export const STREAK_LOOKBACK_DAYS = 180;

/**
 * Workouts in a row without skipping a planned one. Rest days never break
 * the streak, today's workout does not count against it until the day is
 * over, and a missed day is forgiven by a workout on a later rest day.
 */
export function computeStreak(
  today: string,
  trainingDays: readonly number[],
  completedDates: readonly string[],
): number {
  const done = new Set(completedDates);
  let streak = 0;
  // Workouts done on rest days since the day being looked at.
  let makeUps = 0;

  for (let offset = 0; offset <= STREAK_LOOKBACK_DAYS; offset++) {
    const date = addDays(today, -offset);
    const planned = trainingDays.includes(weekdayOf(date));
    if (done.has(date)) {
      streak++;
      if (!planned) makeUps++;
    } else if (planned && offset > 0) {
      if (makeUps === 0) break;
      makeUps--;
    }
  }
  return streak;
}

/** A stable pick from `count` options for a key, e.g. one message per day. */
export function pickVariant(key: string, count: number): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}
