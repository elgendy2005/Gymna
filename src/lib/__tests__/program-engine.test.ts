import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_ACCESS,
  FOCUS_AREA_MUSCLES,
  type MovementPattern,
} from "@/lib/exercise-options";
import type { Contraindication } from "@/lib/health";
import {
  DAYS_PER_WEEK,
  EQUIPMENT,
  GOALS,
  LEVELS,
  SESSION_MINUTES,
  defaultTrainingDays,
  type FocusArea,
} from "@/lib/profile-options";
import {
  alternativesFor,
  chooseSplit,
  estimateMinutes,
  generatePlan,
  isEligible,
  isPlanRepetitive,
  type EngineExercise,
  type EngineProfile,
  type GeneratedPlan,
} from "@/lib/program-engine";
import { buildExercises, type RawExercise } from "../../../prisma/seed/build";
import dataset from "../../../prisma/seed/data/free-exercise-db.json";

const exercises: EngineExercise[] = buildExercises(dataset as unknown as RawExercise[]).filter(
  (exercise) => exercise.engineEligible,
);
const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));
const LEVEL_RANK = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };

function profile(overrides: Partial<EngineProfile> = {}): EngineProfile {
  const daysPerWeek = overrides.daysPerWeek ?? 4;
  return {
    goal: "MUSCLE_GAIN",
    level: "INTERMEDIATE",
    daysPerWeek,
    trainingDays: defaultTrainingDays(daysPerWeek),
    sessionMinutes: 60,
    equipment: "FULL_GYM",
    focusAreas: [],
    contraindications: [],
    needsClearance: false,
    seed: "user-1",
    ...overrides,
  };
}

const HEALTH: readonly (readonly Contraindication[])[] = [
  [],
  ["cardiac", "high_intensity"],
  ["hypertension"],
  ["balance"],
  ["lower_back"],
  ["knee"],
  ["shoulder"],
  ["joint"],
  ["post_surgery"],
  ["pregnancy"],
  ["knee", "lower_back", "shoulder"],
  ["cardiac", "high_intensity", "hypertension", "balance", "joint", "post_surgery", "pregnancy"],
];
const FOCUS: readonly (readonly FocusArea[])[] = [
  [],
  ["arms"],
  ["glutes", "abs"],
  ["chest", "back", "shoulders"],
  ["legs"],
];

/** Every combination of answers the onboarding can produce (focus rotates). */
function* everyProfile(): Generator<EngineProfile> {
  let count = 0;
  for (const daysPerWeek of DAYS_PER_WEEK)
    for (const level of LEVELS)
      for (const goal of GOALS)
        for (const equipment of EQUIPMENT)
          for (const sessionMinutes of SESSION_MINUTES)
            for (const contraindications of HEALTH) {
              yield profile({
                daysPerWeek,
                level,
                goal,
                equipment,
                sessionMinutes,
                contraindications,
                needsClearance: contraindications.length > 0,
                focusAreas: FOCUS[count++ % FOCUS.length],
              });
            }
}

const label = (p: EngineProfile) =>
  `${p.daysPerWeek}d ${p.level} ${p.goal} ${p.equipment} ${p.sessionMinutes}min ` +
  `[${p.contraindications.join(",")}] focus[${p.focusAreas.join(",")}]`;

const areaSets = (plan: GeneratedPlan, area: FocusArea) =>
  plan.days
    .flatMap((day) => day.exercises)
    .filter((item) =>
      bySlug.get(item.slug)!.primaryMuscles.some((m) => FOCUS_AREA_MUSCLES[area].muscles.includes(m)),
    )
    .reduce((total, item) => total + item.sets, 0);

const weeklyPatterns = (plan: GeneratedPlan) =>
  new Set(plan.days.flatMap((day) => day.exercises.map((item) => item.pattern)));

describe("program engine: every combination of answers", () => {
  // One pass collects every broken rule, so a failure names the profiles.
  const problems: Record<string, string[]> = {
    shape: [],
    unsafe: [],
    duplicate: [],
    time: [],
    thin: [],
    prescription: [],
    order: [],
  };
  let plans = 0;

  for (const p of everyProfile()) {
    const plan = generatePlan(p, exercises);
    const name = label(p);
    plans++;

    if (
      plan.days.length !== p.daysPerWeek ||
      plan.days.some((day, index) => day.order !== index || day.weekday !== p.trainingDays[index])
    ) {
      problems.shape.push(name);
    }

    for (const day of plan.days) {
      const slugs = day.exercises.map((item) => item.slug);
      if (new Set(slugs).size !== slugs.length) problems.duplicate.push(name);
      if (day.estimatedMinutes > p.sessionMinutes) problems.time.push(name);
      if (day.estimatedMinutes !== estimateMinutes(day.exercises)) problems.time.push(name);
      if (day.exercises.length < 3) problems.thin.push(`${name} ${day.type}:${slugs.length}`);

      const roles = day.exercises.map((item) => item.role);
      const firstCore = roles.indexOf("core");
      if (firstCore !== -1 && roles.slice(firstCore).some((role) => role !== "core")) {
        problems.order.push(name);
      }
      if (roles.indexOf("main") > 0) problems.order.push(name);

      for (const item of day.exercises) {
        const exercise = bySlug.get(item.slug)!;
        if (
          exercise.contraindications.some((tag) => p.contraindications.includes(tag as never)) ||
          !EQUIPMENT_ACCESS[p.equipment].includes(exercise.equipment) ||
          LEVEL_RANK[exercise.difficulty] > LEVEL_RANK[p.level] ||
          exercise.movementPattern !== item.pattern
        ) {
          problems.unsafe.push(`${name} ${item.slug}`);
        }
        const maxSets = p.needsClearance ? 3 : 5;
        if (
          item.sets < 2 ||
          item.sets > maxSets ||
          item.repMin < 1 ||
          item.repMin > item.repMax ||
          item.restSeconds < 30 ||
          item.restSeconds > 240
        ) {
          problems.prescription.push(`${name} ${item.slug} ${item.sets}x${item.repMin}-${item.repMax}`);
        }
      }
    }
  }

  it("covers the whole grid", () => {
    expect(plans).toBe(5 * 3 * 4 * 3 * 5 * HEALTH.length);
  });
  it("gives one day per training day, on the chosen weekdays", () => {
    expect(problems.shape).toEqual([]);
  });
  it("never picks an exercise the user cannot or should not do", () => {
    expect(problems.unsafe).toEqual([]);
  });
  it("never repeats an exercise within a day", () => {
    expect(problems.duplicate).toEqual([]);
  });
  it("keeps every day within the session length", () => {
    expect(problems.time).toEqual([]);
  });
  it("gives every day at least three exercises", () => {
    expect(problems.thin).toEqual([]);
  });
  it("keeps sets, reps and rest in range, with fewer sets under a health flag", () => {
    expect(problems.prescription).toEqual([]);
  });
  it("puts the main lift first and core work last", () => {
    expect(problems.order).toEqual([]);
  });
});

describe("program engine: weekly coverage", () => {
  const has = (patterns: Set<MovementPattern>, ...any: MovementPattern[]) =>
    any.some((pattern) => patterns.has(pattern));

  it("trains push, pull, knee-dominant and hip-dominant patterns every week", () => {
    const missing: string[] = [];
    for (const daysPerWeek of DAYS_PER_WEEK)
      for (const level of LEVELS)
        for (const goal of GOALS)
          for (const equipment of ["FULL_GYM", "DUMBBELLS"] as const)
            for (const sessionMinutes of SESSION_MINUTES) {
              const p = profile({ daysPerWeek, level, goal, equipment, sessionMinutes });
              const patterns = weeklyPatterns(generatePlan(p, exercises));
              const ok =
                has(patterns, "horizontal_push", "vertical_push") &&
                has(patterns, "horizontal_pull", "vertical_pull") &&
                has(patterns, "squat", "lunge") &&
                has(patterns, "hinge", "glutes", "leg_curl");
              if (!ok) missing.push(`${label(p)} → ${[...patterns].join(",")}`);
            }
    expect(missing).toEqual([]);
  });

  it("still trains upper body, legs and core with body weight only", () => {
    for (const daysPerWeek of DAYS_PER_WEEK) {
      const patterns = weeklyPatterns(
        generatePlan(profile({ daysPerWeek, equipment: "BODYWEIGHT" }), exercises),
      );
      expect(has(patterns, "horizontal_push", "vertical_push"), `${daysPerWeek}d push`).toBe(true);
      expect(has(patterns, "squat", "lunge"), `${daysPerWeek}d legs`).toBe(true);
      expect(patterns.has("core"), `${daysPerWeek}d core`).toBe(true);
    }
  });
});

describe("program engine: variety with body weight and health flags", () => {
  const week = (contraindications: readonly Contraindication[], daysPerWeek = 4) =>
    generatePlan(
      profile({
        daysPerWeek,
        level: "BEGINNER",
        sessionMinutes: 45,
        equipment: "BODYWEIGHT",
        contraindications,
        needsClearance: contraindications.length > 0,
      }),
      exercises,
    );
  const distinct = (plan: GeneratedPlan) =>
    new Set(plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug))).size;

  it("gives more than six different exercises under any single health flag", () => {
    for (const flags of HEALTH.filter((set) => set.length <= 2)) {
      const plan = week(flags);
      expect(distinct(plan), flags.join(",") || "none").toBeGreaterThan(6);
      expect(isPlanRepetitive(plan.days), flags.join(",") || "none").toBe(false);
    }
  });

  it("keeps core work in a short full-body day when push-ups fill two slots", () => {
    for (const day of week(["shoulder"], 3).days) {
      expect(day.exercises.some((exercise) => exercise.pattern === "core")).toBe(true);
    }
  });

  it("flags the week as repetitive when every health flag is set", () => {
    const all: Contraindication[] = [...new Set(HEALTH.flat())];
    const plan = week(all);
    expect(plan.days.every((day) => day.exercises.length >= 3)).toBe(true);
    expect(isPlanRepetitive(plan.days)).toBe(true);
  });
});

describe("isPlanRepetitive", () => {
  const days = (...slugs: string[][]) =>
    slugs.map((day) => ({ exercises: day.map((slug) => ({ slug })) }));

  it("is false for a varied week and for a single day", () => {
    expect(isPlanRepetitive(days(["a", "b", "c"], ["d", "e", "f"], ["a", "g", "h"]))).toBe(false);
    expect(isPlanRepetitive(days(["a", "b", "c"]))).toBe(false);
    expect(isPlanRepetitive([])).toBe(false);
  });

  it("is true when a few exercises are each used twice or more", () => {
    expect(isPlanRepetitive(days(["a", "b", "c"], ["a", "b", "c"]))).toBe(true);
  });

  it("is true when a larger set is used more than 2.5 times each", () => {
    const same = ["a", "b", "c", "d", "e", "f", "g"];
    expect(isPlanRepetitive(days(same, same, same))).toBe(true);
    expect(isPlanRepetitive(days(same, same))).toBe(false);
  });
});

describe("program engine: splits", () => {
  const types = (overrides: Partial<EngineProfile>) =>
    generatePlan(profile(overrides), exercises).days.map((day) => day.type);

  it("picks the split from the days per week and the level", () => {
    expect(types({ daysPerWeek: 2 })).toEqual(["FULL_BODY", "FULL_BODY"]);
    expect(types({ daysPerWeek: 3, level: "BEGINNER" })).toEqual(["FULL_BODY", "FULL_BODY", "FULL_BODY"]);
    expect(types({ daysPerWeek: 3 })).toEqual(["PUSH", "PULL", "LEGS"]);
    expect(types({ daysPerWeek: 4 })).toEqual(["UPPER", "LOWER", "UPPER", "LOWER"]);
    expect(types({ daysPerWeek: 5 })).toEqual(["PUSH", "PULL", "LEGS", "UPPER", "LOWER"]);
    expect(types({ daysPerWeek: 6 })).toEqual(["PUSH", "PULL", "LEGS", "PUSH", "PULL", "LEGS"]);
  });

  it("trains the whole body each day with body weight only", () => {
    expect(chooseSplit({ daysPerWeek: 6, level: "ADVANCED", equipment: "BODYWEIGHT" })).toBe("full_body");
    expect(new Set(types({ daysPerWeek: 5, equipment: "BODYWEIGHT" }))).toEqual(new Set(["FULL_BODY"]));
  });

  it("varies the two days of the same type", () => {
    const plan = generatePlan(profile({ daysPerWeek: 4 }), exercises);
    const [upperA, , upperB] = plan.days.map((day) => day.exercises.map((item) => item.slug));
    const shared = upperA.filter((slug) => upperB.includes(slug));
    expect(shared.length).toBeLessThan(upperA.length / 2);
  });
});

describe("program engine: volume by goal, level and health", () => {
  const firstOf = (overrides: Partial<EngineProfile>) =>
    generatePlan(profile({ sessionMinutes: 90, ...overrides }), exercises).days[0].exercises[0];

  it("sets the main lift's reps by goal", () => {
    expect(firstOf({ goal: "STRENGTH" })).toMatchObject({ role: "main", repMin: 4, repMax: 6 });
    expect(firstOf({ goal: "MUSCLE_GAIN" })).toMatchObject({ repMin: 8, repMax: 10 });
    expect(firstOf({ goal: "FAT_LOSS" })).toMatchObject({ repMin: 10, repMax: 12 });
    expect(firstOf({ goal: "GENERAL_FITNESS" })).toMatchObject({ repMin: 8, repMax: 12 });
  });

  it("gives beginners at most three sets and advanced lifters more", () => {
    const sets = (level: EngineProfile["level"]) =>
      generatePlan(profile({ level, goal: "STRENGTH", sessionMinutes: 90 }), exercises)
        .days.flatMap((day) => day.exercises)
        .map((item) => item.sets);
    expect(Math.max(...sets("BEGINNER"))).toBe(3);
    expect(Math.max(...sets("ADVANCED"))).toBe(5);
  });

  it("keeps loaded lifts at 10+ reps and prefers guided lifts under a health flag", () => {
    const plan = generatePlan(
      profile({ goal: "STRENGTH", needsClearance: true, sessionMinutes: 90 }),
      exercises,
    );
    const items = plan.days.flatMap((day) => day.exercises);
    for (const item of items) {
      const exercise = bySlug.get(item.slug)!;
      if (exercise.equipment !== "BODYWEIGHT") expect(item.repMin, item.slug).toBeGreaterThanOrEqual(10);
      expect(item.sets, item.slug).toBeLessThanOrEqual(3);
    }
    const bigLifts = items.filter((item) => item.role === "main" || item.role === "compound");
    const barbell = bigLifts.filter((item) => bySlug.get(item.slug)!.equipment === "BARBELL");
    expect(barbell.map((item) => item.slug)).toEqual([]);
  });

  it("starts beginners on machines and dumbbells, not the barbell", () => {
    const plan = generatePlan(profile({ level: "BEGINNER", daysPerWeek: 3 }), exercises);
    for (const day of plan.days) {
      expect(bySlug.get(day.exercises[0].slug)!.equipment, day.exercises[0].slug).not.toBe("BARBELL");
    }
  });

  it("counts holds in seconds", () => {
    const plank = { ...bySlug.get("Plank")! };
    expect(isEligible(plank, profile())).toBe(true);
    const plans = [...everyProfile()].slice(0, 400).map((p) => generatePlan(p, exercises));
    const holds = plans
      .flatMap((plan) => plan.days.flatMap((day) => day.exercises))
      .filter((item) => item.slug === "Plank" || item.slug === "Side_Bridge");
    expect(holds.length).toBeGreaterThan(0);
    for (const hold of holds) expect(hold).toMatchObject({ repMin: 20, repMax: 40 });
  });
});

describe("program engine: session length", () => {
  it("fits more work into a longer session", () => {
    const count = (sessionMinutes: number) =>
      generatePlan(profile({ sessionMinutes }), exercises).days.reduce(
        (total, day) => total + day.exercises.length,
        0,
      );
    expect(count(30)).toBeLessThan(count(60));
    expect(count(60)).toBeLessThanOrEqual(count(90));
  });

  it("keeps the main lift when a session is short", () => {
    const plan = generatePlan(profile({ sessionMinutes: 30 }), exercises);
    for (const day of plan.days) expect(day.exercises[0].role).toBe("main");
  });
});

describe("program engine: focus areas", () => {
  const areas = Object.keys(FOCUS_AREA_MUSCLES) as FocusArea[];

  it("adds weekly sets for each focus area without breaking the caps", () => {
    const flat: string[] = [];
    for (const daysPerWeek of DAYS_PER_WEEK)
      for (const sessionMinutes of [45, 60, 90])
        for (const area of areas) {
          const base = profile({ daysPerWeek, sessionMinutes });
          const without = generatePlan(base, exercises);
          const withFocus = generatePlan({ ...base, focusAreas: [area] }, exercises);
          const gain = areaSets(withFocus, area) - areaSets(without, area);
          if (gain <= 0) flat.push(`${daysPerWeek}d ${sessionMinutes}min ${area}: ${gain}`);

          for (const day of withFocus.days) {
            expect(day.estimatedMinutes).toBeLessThanOrEqual(sessionMinutes);
            for (const item of day.exercises) expect(item.sets).toBeLessThanOrEqual(5);
          }
          const extras = withFocus.days.flatMap((day) => day.exercises).filter((item) => item.focusExtra);
          expect(extras.length).toBeGreaterThan(0);
          // Per area: an extra set on up to two days plus one extra exercise.
          expect(extras.length).toBeLessThanOrEqual(3);
        }
    expect(flat).toEqual([]);
  });

  it("marks nothing as extra when no area is chosen", () => {
    const plan = generatePlan(profile(), exercises);
    expect(plan.days.flatMap((day) => day.exercises).some((item) => item.focusExtra)).toBe(false);
  });

  it("keeps the split and the day count", () => {
    const base = profile({ daysPerWeek: 5 });
    const focused = generatePlan({ ...base, focusAreas: ["arms", "glutes", "abs"] }, exercises);
    expect(focused.split).toBe(generatePlan(base, exercises).split);
    expect(focused.days).toHaveLength(5);
  });
});

describe("program engine: determinism", () => {
  it("gives the same plan for the same answers", () => {
    for (const p of [...everyProfile()].filter((_, index) => index % 97 === 0)) {
      expect(generatePlan(p, exercises)).toEqual(generatePlan(p, exercises));
      expect(generatePlan(p, [...exercises].reverse())).toEqual(generatePlan(p, exercises));
    }
  });

  it("uses the seed only to settle ties", () => {
    const plans = ["a", "b", "c", "d", "e"].map((seed) => generatePlan(profile({ seed }), exercises));
    const signatures = new Set(
      plans.map((plan) => plan.days.map((day) => day.exercises.map((item) => item.slug).join()).join("|")),
    );
    expect(signatures.size).toBeGreaterThan(1);
    for (const plan of plans) {
      expect(plan.days.map((day) => day.type)).toEqual(plans[0].days.map((day) => day.type));
    }
  });
});

describe("program engine: alternatives", () => {
  it("offers swaps of the same pattern first, all safe for the user", () => {
    const p = profile({ contraindications: ["knee"], needsClearance: true });
    const plan = generatePlan(p, exercises);
    for (const item of plan.days.flatMap((day) => day.exercises)) {
      const swaps = alternativesFor(item.slug, p, exercises);
      expect(swaps.map((swap) => swap.slug)).not.toContain(item.slug);
      for (const swap of swaps) expect(isEligible(swap, p), swap.slug).toBe(true);
      const patterns = swaps.map((swap) => swap.movementPattern === item.pattern);
      // Same-pattern swaps come before the same-muscle ones.
      expect(patterns.lastIndexOf(true)).toBeLessThan(
        patterns.includes(false) ? patterns.indexOf(false) : patterns.length,
      );
    }
  });

  it("respects the equipment, the exclusions and the limit", () => {
    const home = profile({ equipment: "DUMBBELLS" });
    const swaps = alternativesFor("Dumbbell_Bench_Press", home, exercises, [], 3);
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.length).toBeLessThanOrEqual(3);
    for (const swap of swaps) expect(["DUMBBELL", "BODYWEIGHT"]).toContain(swap.equipment);

    const all = alternativesFor("Dumbbell_Bench_Press", home, exercises);
    const excluded = alternativesFor("Dumbbell_Bench_Press", home, exercises, [all[0].slug]);
    expect(excluded.map((swap) => swap.slug)).not.toContain(all[0].slug);
    expect(alternativesFor("No_Such_Exercise", home, exercises)).toEqual([]);
  });
});
