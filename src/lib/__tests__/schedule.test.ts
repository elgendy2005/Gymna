import { describe, expect, it } from "vitest";
import {
  addDays,
  buildWeek,
  computeStreak,
  dateFromDb,
  dateToDb,
  localDateTime,
  nextTrainingWeekday,
  pickToday,
  pickVariant,
  weekOf,
  weekdayOf,
} from "@/lib/schedule";

// 2026-11-14 is a Saturday, the first day of the training week.
const SAT = "2026-11-14";
const SUN = "2026-11-15";
const MON = "2026-11-16";
const TUE = "2026-11-17";
const WED = "2026-11-18";
const THU = "2026-11-19";
const FRI = "2026-11-20";

// Sat, Sun, Tue, Wed: the default four-day spread.
const DAYS = [
  { id: "a", weekday: 0 },
  { id: "b", weekday: 1 },
  { id: "c", weekday: 3 },
  { id: "d", weekday: 4 },
];
const TRAINING = DAYS.map((day) => day.weekday);
const workout = (date: string, planDayId: string | null = null) => ({ date, planDayId });

describe("local dates", () => {
  it("finds the calendar day in the user's time zone", () => {
    const lateEvening = new Date("2026-11-14T22:30:00Z");
    expect(localDateTime(lateEvening, "Africa/Cairo")).toEqual({ date: "2026-11-15", hour: 0 });
    expect(localDateTime(lateEvening, "America/New_York")).toEqual({ date: "2026-11-14", hour: 17 });
    expect(localDateTime(lateEvening, "UTC")).toEqual({ date: "2026-11-14", hour: 22 });
  });

  it("falls back to Cairo for an unknown zone", () => {
    const now = new Date("2026-11-14T22:30:00Z");
    expect(localDateTime(now, "Mars/Olympus")).toEqual(localDateTime(now, "Africa/Cairo"));
  });

  it("numbers weekdays from Saturday", () => {
    expect([SAT, SUN, MON, TUE, WED, THU, FRI].map(weekdayOf)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("lists the week from Saturday to Friday", () => {
    expect(weekOf(WED)).toEqual([SAT, SUN, MON, TUE, WED, THU, FRI]);
    expect(weekOf(SAT)[0]).toBe(SAT);
    expect(weekOf(FRI)[6]).toBe(FRI);
  });

  it("adds days across months and round-trips through the database type", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(dateFromDb(dateToDb(SAT))).toBe(SAT);
  });
});

describe("week strip", () => {
  it("marks training days, today, done and missed days", () => {
    const week = buildWeek(TUE, DAYS, [workout(SAT, "a")]);
    expect(week.map((day) => day.training)).toEqual([true, true, false, true, true, false, false]);
    expect(week.map((day) => day.isToday)).toEqual([false, false, false, true, false, false, false]);
    expect(week.map((day) => day.done)).toEqual([true, false, false, false, false, false, false]);
    // Sunday was planned and skipped. Today is not missed yet.
    expect(week.map((day) => day.missed)).toEqual([false, true, false, false, false, false, false]);
  });

  it("clears a missed day once it is made up on a rest day", () => {
    const week = buildWeek(TUE, DAYS, [workout(SAT, "a"), workout(MON, "b")]);
    expect(week[1].missed).toBe(false);
    expect(week[2]).toMatchObject({ training: false, done: true });
  });
});

describe("a user who started mid-week", () => {
  it("owes nothing from before their first plan", () => {
    // The plan was created on Monday: Saturday and Sunday were never theirs.
    const week = buildWeek(THU, DAYS, [workout(TUE, "c")], MON);
    expect(week.map((day) => day.missed)).toEqual([false, false, false, false, true, false, false]);
    expect(pickToday(MON, DAYS, [], MON)).toEqual({ kind: "rest", missed: null });
    expect(pickToday(THU, DAYS, [workout(TUE, "c")], MON)).toEqual({ kind: "rest", missed: DAYS[3] });
  });
});

describe("what today offers", () => {
  it("offers the planned workout on a training day", () => {
    expect(pickToday(SAT, DAYS, [])).toEqual({ kind: "training", day: DAYS[0] });
  });

  it("is done once a workout was completed today", () => {
    expect(pickToday(SAT, DAYS, [workout(SAT, "a")])).toEqual({ kind: "done", day: DAYS[0] });
    expect(pickToday(MON, DAYS, [workout(SAT), workout(SUN), workout(MON, "b")])).toEqual({
      kind: "done",
      day: null,
    });
  });

  it("rests on a rest day when nothing was missed", () => {
    expect(pickToday(MON, DAYS, [workout(SAT, "a"), workout(SUN, "b")])).toEqual({
      kind: "rest",
      missed: null,
    });
  });

  it("offers the latest missed session on a rest day", () => {
    expect(pickToday(MON, DAYS, [workout(SAT, "a")])).toEqual({ kind: "rest", missed: DAYS[1] });
    expect(pickToday(THU, DAYS, [workout(TUE, "c")])).toEqual({ kind: "rest", missed: DAYS[3] });
  });

  it("does not offer a session that was already made up", () => {
    // Sunday's session was done on Monday; on Thursday only Wednesday is open.
    const completed = [workout(SAT, "a"), workout(MON, "b"), workout(TUE, "c")];
    expect(pickToday(THU, DAYS, completed)).toEqual({ kind: "rest", missed: DAYS[3] });
    expect(pickToday(THU, DAYS, [...completed, workout(WED, "d")])).toEqual({
      kind: "rest",
      missed: null,
    });
  });

  it("does not reach back into last week", () => {
    // Saturday is the first day of a new week: nothing earlier to make up.
    expect(pickToday("2026-11-21", [{ id: "x", weekday: 3 }], [])).toEqual({ kind: "rest", missed: null });
  });
});

describe("next training day", () => {
  it("finds the next planned weekday, wrapping to next week", () => {
    expect(nextTrainingWeekday(1, TRAINING)).toBe(3);
    expect(nextTrainingWeekday(4, TRAINING)).toBe(0);
    expect(nextTrainingWeekday(0, [0])).toBe(0);
    expect(nextTrainingWeekday(0, [])).toBeNull();
  });
});

describe("streak", () => {
  it("counts workouts in a row across rest days", () => {
    expect(computeStreak(WED, TRAINING, [SAT, SUN, TUE, WED])).toBe(4);
    // Thursday and Friday are rest days: the streak stands.
    expect(computeStreak(FRI, TRAINING, [SAT, SUN, TUE, WED])).toBe(4);
  });

  it("does not count today against the streak before the workout", () => {
    expect(computeStreak(TUE, TRAINING, [SAT, SUN])).toBe(2);
  });

  it("breaks on a planned day that was skipped", () => {
    // Sunday skipped: only Tuesday and Wednesday count.
    expect(computeStreak(WED, TRAINING, [SAT, TUE, WED])).toBe(2);
    expect(computeStreak(WED, TRAINING, [])).toBe(0);
  });

  it("forgives a skipped day that was made up on a later rest day", () => {
    // Sunday skipped, done on Monday instead.
    expect(computeStreak(WED, TRAINING, [SAT, MON, TUE, WED])).toBe(4);
    // A rest-day workout before the skipped day does not cover it.
    expect(computeStreak(WED, [1, 3, 4], [SAT, TUE, WED])).toBe(2);
  });

  it("runs across weeks", () => {
    const lastWeek = ["2026-11-07", "2026-11-08", "2026-11-10", "2026-11-11"];
    expect(computeStreak(SUN, TRAINING, [...lastWeek, SAT, SUN])).toBe(6);
  });
});

describe("variant picker", () => {
  it("is stable for a key and stays in range", () => {
    for (const key of ["2026-11-14", "2026-11-15:abc", ""]) {
      const pick = pickVariant(key, 3);
      expect(pick).toBe(pickVariant(key, 3));
      expect(pick).toBeGreaterThanOrEqual(0);
      expect(pick).toBeLessThan(3);
    }
    const picks = new Set(Array.from({ length: 40 }, (_, index) => pickVariant(`day-${index}`, 3)));
    expect(picks.size).toBe(3);
  });
});
