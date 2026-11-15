import { describe, expect, it } from "vitest";
import { buildCoachContext, COACH_LIMITS, type CoachContextInput } from "@/lib/coach-context";

const input = (overrides: Partial<CoachContextInput> = {}): CoachContextInput => ({
  date: "2026-11-15",
  profile: {
    age: 30,
    gender: "MALE",
    weightKg: 80,
    goal: "MUSCLE_GAIN",
    level: "INTERMEDIATE",
    experience: "OVER_6_MONTHS",
    unitSystem: "METRIC",
    needsClearance: false,
    contraindications: [],
  },
  plan: {
    split: "upper_lower",
    days: [
      { weekday: 0, type: "UPPER" },
      { weekday: 1, type: "LOWER" },
    ],
  },
  streak: 3,
  today: {
    dayType: "LOWER",
    exercises: [
      { name: "Barbell Squat", sets: 4, repMin: 8, repMax: 10, suggestedKg: 62.5, reason: "step_up" },
      { name: "Hanging Leg Raise", sets: 3, repMin: 5, repMax: 10, suggestedKg: null, reason: "bodyweight_reps" },
    ],
  },
  recent: [
    {
      date: "2026-11-14",
      dayType: "UPPER",
      exercises: [
        {
          name: "Barbell Bench Press",
          sets: [
            { weightKg: 60, reps: 10 },
            { weightKg: 60, reps: 9 },
          ],
        },
        { name: "Pushups", sets: [{ weightKg: null, reps: 15 }] },
      ],
    },
  ],
  lifts: [
    { name: "Barbell Bench Press", e1rmKg: 80, bestE1rmKg: 82.5, sessions: 6 },
    { name: "Pushups", e1rmKg: null, bestE1rmKg: null, sessions: 4 },
  ],
  ...overrides,
});

describe("coach context", () => {
  it("covers the profile, plan, today's suggestions, recent lifts and maxes", () => {
    const text = buildCoachContext(input());
    expect(text).toContain("User: 30 y, male, 80 kg");
    expect(text).toContain("Goal: MUSCLE_GAIN. Level: INTERMEDIATE.");
    expect(text).toContain("Plan: upper_lower: Sat UPPER, Sun LOWER. Streak: 3 in a row.");
    expect(text).toContain("- Barbell Squat: 4 x 8-10, suggested 62.5 kg (step_up)");
    expect(text).toContain("- Hanging Leg Raise: 3 x 5-10, suggested bodyweight (bodyweight_reps)");
    expect(text).toContain("  - Barbell Bench Press: 60 kg x 10, 60 kg x 9");
    expect(text).toContain("  - Pushups: 15");
    expect(text).toContain("- Barbell Bench Press: 80 kg / 82.5 kg over 6 sessions");
    // No estimated max to report for bodyweight work.
    expect(text).not.toContain("- Pushups: bodyweight /");
  });

  it("speaks the user's units", () => {
    const imperial = input();
    imperial.profile = { ...imperial.profile, unitSystem: "IMPERIAL" };
    const text = buildCoachContext(imperial);
    expect(text).toContain("176.4 lb");
    expect(text).toContain("suggested 137.8 lb");
    expect(text).not.toMatch(/\d kg/);
  });

  it("passes on movement tags to avoid, never the health answers themselves", () => {
    const flagged = input();
    flagged.profile = {
      ...flagged.profile,
      needsClearance: true,
      contraindications: ["knee", "lower_back"],
    };
    const text = buildCoachContext(flagged);
    expect(text).toContain("Avoid movements tagged: knee, lower_back");
    expect(text).toContain("conservative");
    expect(buildCoachContext(input())).toContain("Health: no flags in screening.");
  });

  it("says so when there is nothing to do or nothing logged", () => {
    const text = buildCoachContext(input({ today: null, recent: [], lifts: [] }));
    expect(text).toContain("Today: no session to do");
    expect(text).toContain("Recent workouts: none logged yet.");
    expect(text).not.toContain("Estimated one-rep maxes");
  });

  it("caps how much history is sent", () => {
    const workout = input().recent[0];
    const many = input({
      recent: Array.from({ length: 12 }, (_, index) => ({ ...workout, date: `2026-10-${10 + index}` })),
      lifts: Array.from({ length: 30 }, (_, index) => ({
        name: `Lift ${index}`,
        e1rmKg: 50,
        bestE1rmKg: 55,
        sessions: 2,
      })),
    });
    const text = buildCoachContext(many);
    expect(text.match(/^- 2026-10-/gm)).toHaveLength(COACH_LIMITS.recentWorkouts);
    expect(text.match(/^- Lift /gm)).toHaveLength(COACH_LIMITS.lifts);
  });
});
