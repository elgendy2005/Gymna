import { describe, expect, it } from "vitest";
import { BASELINE_LIFTS } from "@/lib/profile-options";
import { kgToLb, lbToKg } from "@/lib/units";
import {
  ANCHOR_EXERCISES,
  REASON_CODES,
  adjustAfterSet,
  bestRecentE1rm,
  displayWeight,
  epley,
  estimateAnchor,
  exerciseProfile,
  percentForRange,
  percentForReps,
  platesPerSide,
  recommend,
  reviewSession,
  roundLoad,
  stepDown,
  stepUp,
  warmupSets,
  type Effort,
  type Lifter,
  type LoadSettings,
  type PastSession,
  type RecommendInput,
  type WeightExercise,
} from "@/lib/weight-engine";
import { buildExercises, type RawExercise } from "../../../prisma/seed/build";
import dataset from "../../../prisma/seed/data/free-exercise-db.json";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

const curated = buildExercises(dataset as unknown as RawExercise[]).filter(
  (exercise) => exercise.engineEligible,
);
const exercise = (slug: string): WeightExercise => {
  const found = curated.find((item) => item.slug === slug);
  if (!found) throw new Error(`no curated exercise ${slug}`);
  return found;
};

const BENCH = exercise("Barbell_Bench_Press_-_Medium_Grip");
const SQUAT = exercise("Barbell_Squat");
const CURL = exercise("Dumbbell_Bicep_Curl");
const PULLDOWN = exercise("Wide-Grip_Lat_Pulldown");
const PUSHUP = exercise("Pushups");

const METRIC: LoadSettings = { unitSystem: "METRIC", dumbbellStepKg: 2, machineStepKg: 5 };
const IMPERIAL: LoadSettings = { ...METRIC, unitSystem: "IMPERIAL" };
const NOW = new Date("2026-11-15T10:00:00Z");

const lifter = (overrides: Partial<Lifter> = {}): Lifter => ({
  bodyWeightKg: 80,
  gender: "MALE",
  age: 30,
  level: "INTERMEDIATE",
  experience: "OVER_6_MONTHS",
  needsClearance: false,
  ...overrides,
});

const TARGET = { sets: 3, repMin: 8, repMax: 10 };

/** A past session `daysAgo` days back: same weight on every set. */
function session(
  daysAgo: number,
  weightKg: number | null,
  reps: number[],
  feedback: Effort | null = "RIGHT",
  range = TARGET,
): PastSession {
  return {
    date: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    targetSets: range.sets,
    repMin: range.repMin,
    repMax: range.repMax,
    sets: reps.map((count) => ({ weightKg, reps: count })),
    feedback,
  };
}

const ask = (overrides: Partial<RecommendInput> = {}) =>
  recommend({
    exercise: BENCH,
    target: TARGET,
    lifter: lifter(),
    settings: METRIC,
    history: [],
    now: NOW,
    ...overrides,
  });

describe("one-rep max estimates", () => {
  it("uses Epley, with one rep being the weight itself", () => {
    expect(epley(100, 1)).toBe(100);
    expect(epley(100, 10)).toBeCloseTo(133.33, 1);
    expect(epley(0, 10)).toBe(0);
    // Past 20 reps the estimate stops growing.
    expect(epley(50, 40)).toBe(epley(50, 20));
  });

  it("loads about 85% for 5 reps, 75% for 8-10 and 65-70% for 12-15", () => {
    expect(percentForReps(5)).toBeCloseTo(0.85, 2);
    expect(percentForRange(8, 10)).toBeGreaterThan(0.74);
    expect(percentForRange(8, 10)).toBeLessThan(0.77);
    expect(percentForRange(12, 15)).toBeGreaterThanOrEqual(0.65);
    expect(percentForRange(12, 15)).toBeLessThanOrEqual(0.7);
    for (let reps = 1; reps < 25; reps++) {
      expect(percentForReps(reps + 1)).toBeLessThanOrEqual(percentForReps(reps));
    }
  });

  it("takes the best set of the recent window", () => {
    const history = [session(3, 60, [8, 8, 8]), session(10, 62.5, [8, 7, 6]), session(90, 80, [10])];
    expect(bestRecentE1rm(history, NOW)).toBeCloseTo(epley(62.5, 8), 5);
  });

  it("falls back to the latest session after a long break", () => {
    const history = [session(200, 80, [10]), session(100, 60, [8])];
    expect(bestRecentE1rm(history, NOW)).toBeCloseTo(epley(60, 8), 5);
    expect(bestRecentE1rm([], NOW)).toBeNull();
    expect(bestRecentE1rm([session(1, null, [12])], NOW)).toBeNull();
  });
});

describe("rounding to loadable weights", () => {
  it("rounds barbells to 2.5 kg and never below the empty bar", () => {
    expect(roundLoad(41.2, "barbell", METRIC)).toBe(40);
    expect(roundLoad(41.3, "barbell", METRIC)).toBe(42.5);
    expect(roundLoad(7, "barbell", METRIC)).toBe(20);
    expect(roundLoad(3, "ez_bar", METRIC)).toBe(10);
  });

  it("rounds dumbbells and stacks to the steps set in settings", () => {
    expect(roundLoad(9.1, "dumbbell", METRIC)).toBe(10);
    expect(roundLoad(9.1, "dumbbell", { ...METRIC, dumbbellStepKg: 2.5 })).toBe(10);
    expect(roundLoad(8.6, "dumbbell", { ...METRIC, dumbbellStepKg: 2.5 })).toBe(7.5);
    expect(roundLoad(0.4, "dumbbell", METRIC)).toBe(2);
    expect(roundLoad(32, "machine", METRIC)).toBe(30);
    expect(roundLoad(32, "cable", { ...METRIC, machineStepKg: 2.5 })).toBe(32.5);
    expect(roundLoad(1, "machine", METRIC)).toBe(5);
  });

  it("rounds in pounds for imperial lifters: 5 lb bars and dumbbells, 10 lb stacks", () => {
    expect(kgToLb(roundLoad(lbToKg(137), "barbell", IMPERIAL))).toBeCloseTo(135, 1);
    expect(kgToLb(roundLoad(lbToKg(20), "barbell", IMPERIAL))).toBeCloseTo(45, 1);
    expect(kgToLb(roundLoad(lbToKg(22), "dumbbell", IMPERIAL))).toBeCloseTo(20, 1);
    expect(kgToLb(roundLoad(lbToKg(64), "machine", IMPERIAL))).toBeCloseTo(60, 1);
    expect(displayWeight(roundLoad(lbToKg(137), "barbell", IMPERIAL), IMPERIAL)).toBe(135);
    expect(displayWeight(42.5, METRIC)).toBe(42.5);
  });

  it("steps to the next loadable weight in either direction", () => {
    expect(stepUp(40, "barbell", METRIC)).toBe(42.5);
    expect(stepUp(40, "barbell", METRIC, 5)).toBe(45);
    expect(stepUp(41, "barbell", METRIC)).toBe(42.5);
    expect(stepUp(10, "dumbbell", METRIC)).toBe(12);
    expect(stepUp(10, "dumbbell", METRIC, 2.5)).toBe(14);
    expect(stepDown(42.5, "barbell", METRIC)).toBe(40);
    expect(stepDown(20, "barbell", METRIC)).toBe(20);
    expect(displayWeight(stepUp(lbToKg(135), "barbell", IMPERIAL), IMPERIAL)).toBe(140);
  });
});

describe("plate calculator", () => {
  it("lists the plates for one side, heaviest first", () => {
    expect(platesPerSide(100, "METRIC")).toEqual({
      unit: "kg",
      bar: 20,
      perSide: [25, 15],
      leftover: 0,
    });
    expect(platesPerSide(62.5, "METRIC").perSide).toEqual([20, 1.25]);
    expect(platesPerSide(20, "METRIC").perSide).toEqual([]);
  });

  it("works in pounds with a 45 lb bar", () => {
    expect(platesPerSide(lbToKg(135), "IMPERIAL")).toEqual({
      unit: "lb",
      bar: 45,
      perSide: [45],
      leftover: 0,
    });
    expect(platesPerSide(lbToKg(185), "IMPERIAL").perSide).toEqual([45, 25]);
  });

  it("reports what cannot be loaded", () => {
    expect(platesPerSide(61, "METRIC")).toMatchObject({ perSide: [20], leftover: 1 });
    expect(platesPerSide(15, "METRIC")).toMatchObject({ perSide: [], leftover: 0 });
    expect(platesPerSide(30, "METRIC", "ez_bar")).toMatchObject({ bar: 10, perSide: [10] });
  });
});

describe("exercise profiles", () => {
  it("measures each reference lift on a curated exercise", () => {
    for (const lift of BASELINE_LIFTS) {
      const profile = exerciseProfile(exercise(ANCHOR_EXERCISES[lift]));
      expect(profile, lift).toMatchObject({ anchor: lift, ratio: 1 });
    }
  });

  it("gives every curated exercise a load type and a sane ratio", () => {
    for (const item of curated) {
      const profile = exerciseProfile(item);
      expect(profile.ratio, item.slug).toBeGreaterThan(0);
      expect(profile.ratio, item.slug).toBeLessThanOrEqual(2);
      if (item.equipment === "BODYWEIGHT") expect(profile.loadType).toBe("bodyweight");
    }
    expect(exerciseProfile(SQUAT)).toMatchObject({ loadType: "barbell", region: "lower" });
    expect(exerciseProfile(CURL)).toMatchObject({ loadType: "dumbbell", region: "upper" });
    expect(exerciseProfile(exercise("Trap_Bar_Deadlift")).loadType).toBe("barbell");
    expect(exerciseProfile(exercise("Goblet_Squat")).loadType).toBe("dumbbell");
  });

  it("puts a dumbbell press at roughly a third of the bench press per hand", () => {
    const incline = exerciseProfile(exercise("Incline_Dumbbell_Press"));
    expect(incline).toMatchObject({ anchor: "bench_press", loadType: "dumbbell" });
    expect(incline.ratio).toBeGreaterThan(0.3);
    expect(incline.ratio).toBeLessThan(0.4);
  });
});

describe("first-time weights", () => {
  it("starts a beginner with no known lifts light, as a calibration", () => {
    const novice = lifter({ level: "BEGINNER", experience: "NEVER" });
    const bench = ask({ lifter: novice });
    expect(bench).toMatchObject({ calibration: true, deload: false, repMin: 8, repMax: 10 });
    expect(bench.reason.code).toBe("start_bodyweight");
    // The empty bar for a first bench press.
    expect(bench.weightKg).toBe(20);

    const curl = ask({ lifter: novice, exercise: CURL, target: { sets: 3, repMin: 10, repMax: 15 } });
    expect(curl.weightKg).toBeGreaterThanOrEqual(2);
    expect(curl.weightKg).toBeLessThanOrEqual(8);
  });

  it("never goes below the lightest loadable option", () => {
    const small = lifter({ bodyWeightKg: 40, gender: "FEMALE", age: 70, experience: "NEVER" });
    for (const item of curated) {
      const result = ask({ lifter: small, exercise: item });
      const { loadType } = exerciseProfile(item);
      if (loadType === "bodyweight") expect(result.weightKg, item.slug).toBeNull();
      else {
        const floor = { barbell: 20, ez_bar: 10, dumbbell: 2, machine: 5, cable: 5 }[loadType];
        expect(result.weightKg, item.slug).toBeGreaterThanOrEqual(floor);
      }
    }
  });

  it("starts lower for women, older lifters and less experience", () => {
    const squat = (overrides: Partial<Lifter>) =>
      ask({ exercise: exercise("Leg_Press"), lifter: lifter(overrides) }).weightKg!;
    const base = squat({});
    expect(squat({ gender: "FEMALE" })).toBeLessThan(base);
    expect(squat({ age: 55 })).toBeLessThan(base);
    expect(squat({ age: 65 })).toBeLessThan(squat({ age: 55 }));
    expect(squat({ experience: "NEVER" })).toBeLessThan(base);
    expect(squat({ experience: "OVER_2_YEARS" })).toBeGreaterThan(base);
    expect(squat({ needsClearance: true })).toBeLessThan(base);
    // Before the experience question existed, the level stands in.
    expect(squat({ experience: null, level: "BEGINNER" })).toBeLessThan(
      squat({ experience: null, level: "ADVANCED" }),
    );
  });

  it("uses the lift the user reported at onboarding", () => {
    const known = { baselines: { bench_press: { weightKg: 80, reps: 5 } } };
    const result = ask({ known });
    expect(result.reason.code).toBe("start_baseline");
    expect(result.calibration).toBe(true);
    // 80 x 5 is about a 93 kg max; sets of 8-10 sit near 75% of that, less a margin.
    expect(result.weightKg).toBeGreaterThanOrEqual(62.5);
    expect(result.weightKg).toBeLessThanOrEqual(70);
  });

  it("estimates related exercises from a known lift", () => {
    const known = { baselines: { bench_press: { weightKg: 80, reps: 5 } } };
    const incline = ask({ exercise: exercise("Incline_Dumbbell_Press"), known });
    expect(incline.reason.code).toBe("start_related");
    // About a third of the bench press in each hand.
    expect(incline.weightKg).toBeGreaterThanOrEqual(18);
    expect(incline.weightKg).toBeLessThanOrEqual(24);

    // A lift that was not reported is worked out from the one that was.
    const squat = ask({ exercise: SQUAT, known });
    expect(squat.reason.code).toBe("start_related");
    expect(squat.weightKg).toBeGreaterThan(ask({ known }).weightKg!);
    expect(estimateAnchor("squat", "lower", lifter(), known).source).toBe("related");
  });

  it("prefers logged strength on a reference lift over the onboarding answer", () => {
    const told = { bench_press: { weightKg: 60, reps: 5 } };
    const fromTold = ask({ exercise: exercise("Dumbbell_Bench_Press"), known: { baselines: told } });
    const fromLogged = ask({
      exercise: exercise("Dumbbell_Bench_Press"),
      known: { baselines: told, logged: { bench_press: 110 } },
    });
    expect(fromLogged.weightKg).toBeGreaterThan(fromTold.weightKg!);
  });

  it("gives bodyweight exercises no weight", () => {
    expect(ask({ exercise: PUSHUP })).toMatchObject({
      weightKg: null,
      calibration: false,
      warmups: [],
      reason: { code: "bodyweight_start" },
    });
  });
});

describe("progression", () => {
  it("adds weight once every set reaches the top of the range", () => {
    const bench = ask({ history: [session(3, 60, [10, 10, 10])] });
    expect(bench).toMatchObject({ weightKg: 62.5, calibration: false });
    expect(bench.reason).toEqual({ code: "step_up", fromKg: 60, toKg: 62.5 });

    // Lower-body compounds take 5 kg.
    expect(ask({ exercise: SQUAT, history: [session(3, 80, [10, 10, 10])] }).weightKg).toBe(85);
    // Single-joint lifts take the next dumbbell.
    expect(ask({ exercise: CURL, history: [session(3, 10, [10, 10, 10])] }).weightKg).toBe(12);
    // Stacks move one plate.
    expect(ask({ exercise: PULLDOWN, history: [session(3, 50, [10, 10, 10])] }).weightKg).toBe(55);
  });

  it("takes a bigger step after an easy session", () => {
    const bench = ask({ history: [session(3, 60, [10, 10, 10], "EASY")] });
    expect(bench.reason).toEqual({ code: "step_up_easy", fromKg: 60, toKg: 65 });
  });

  it("steps in pounds for imperial lifters", () => {
    const bench = ask({
      settings: IMPERIAL,
      history: [session(3, lbToKg(135), [10, 10, 10])],
    });
    expect(displayWeight(bench.weightKg!, IMPERIAL)).toBe(140);
    const squat = ask({
      exercise: SQUAT,
      settings: IMPERIAL,
      history: [session(3, lbToKg(185), [10, 10, 10])],
    });
    expect(displayWeight(squat.weightKg!, IMPERIAL)).toBe(195);
  });

  it("keeps the weight and asks for more reps inside the range", () => {
    const bench = ask({ history: [session(3, 60, [10, 9, 8])] });
    expect(bench.weightKg).toBe(60);
    expect(bench.reason).toEqual({ code: "add_reps", reps: 9 });
  });

  it("does not step up from a single set of a three-set plan", () => {
    expect(ask({ history: [session(3, 60, [10])] }).reason.code).toBe("add_reps");
  });

  it("holds after a hard session or a miss", () => {
    expect(ask({ history: [session(3, 60, [10, 10, 10], "HARD")] })).toMatchObject({
      weightKg: 60,
      reason: { code: "hold_hard" },
    });
    expect(ask({ history: [session(3, 60, [8, 7, 6])] })).toMatchObject({
      weightKg: 60,
      reason: { code: "hold_missed" },
    });
  });

  it("takes 10% off after two misses in a row", () => {
    const bench = ask({ history: [session(3, 60, [7, 6, 6]), session(6, 60, [8, 7, 6])] });
    expect(bench.reason).toEqual({ code: "reduce", fromKg: 60, toKg: 52.5 });
    expect(bench.deload).toBe(false);
    // A miss at a different weight does not count towards the two.
    expect(
      ask({ history: [session(3, 60, [7, 6, 6]), session(6, 65, [7, 6, 6])] }).reason.code,
    ).toBe("hold_missed");
  });

  it("cannot reduce below the empty bar", () => {
    const bench = ask({ history: [session(3, 20, [6, 6, 5]), session(6, 20, [6, 5, 5])] });
    expect(bench).toMatchObject({ weightKg: 20, reason: { code: "hold_missed" } });
  });

  it("suggests a deload after several sessions stuck at one weight", () => {
    const stuck = [session(3, 60, [9, 8, 8]), session(6, 60, [9, 8, 8]), session(9, 60, [9, 9, 8])];
    const bench = ask({ history: stuck });
    expect(bench).toMatchObject({ deload: true, weightKg: 52.5 });
    expect(bench.reason.code).toBe("deload");

    // Reps still climbing is not a stall.
    const climbing = [session(3, 60, [10, 9, 9]), session(6, 60, [9, 9, 8]), session(9, 60, [9, 8, 8])];
    expect(ask({ history: climbing })).toMatchObject({ deload: false, weightKg: 60 });
  });

  it("follows what was lifted, not what was suggested", () => {
    // The engine suggested 60, the lifter loaded 70 and hit every rep.
    expect(ask({ history: [session(3, 70, [10, 10, 10])] }).weightKg).toBe(72.5);
    // A first set at 50, then moved up to 55 for the rest.
    const corrected: PastSession = {
      ...session(3, 55, [10, 10]),
      sets: [
        { weightKg: 50, reps: 10 },
        { weightKg: 55, reps: 10 },
        { weightKg: 55, reps: 10 },
      ],
    };
    expect(reviewSession(corrected)).toMatchObject({ weightKg: 55, outcome: "top" });
    expect(ask({ history: [corrected] }).weightKg).toBe(57.5);
    // Order of the history does not matter: the latest date leads.
    expect(
      ask({ history: [session(10, 50, [10, 10, 10]), session(3, 60, [9, 9, 8])] }).weightKg,
    ).toBe(60);
  });

  it("refits the weight when the plan changes the rep range", () => {
    const heavy = { sets: 4, repMin: 4, repMax: 6 };
    const bench = ask({ history: [session(3, 60, [10, 10, 10])], target: heavy });
    expect(bench.reason.code).toBe("new_range");
    // 60 x 10 is an 80 kg max; sets of 4-6 sit near 85% of it.
    expect(bench.weightKg).toBe(67.5);
    expect(bench).toMatchObject({ repMin: 4, repMax: 6, calibration: false });
  });

  it("ignores sessions with no completed sets", () => {
    expect(ask({ history: [session(1, 60, [])] })).toMatchObject({ calibration: true });
    expect(ask({ history: [session(1, 60, []), session(4, 60, [10, 10, 10])] }).weightKg).toBe(62.5);
  });
});

describe("health flags", () => {
  const flagged = lifter({ needsClearance: true });

  it("waits for two good sessions before adding weight", () => {
    const once = ask({ lifter: flagged, history: [session(3, 60, [10, 10, 10])] });
    expect(once).toMatchObject({ weightKg: 60, reason: { code: "hold_confirm" } });

    const twice = ask({
      lifter: flagged,
      history: [session(3, 60, [10, 10, 10]), session(6, 60, [10, 10, 10])],
    });
    expect(twice.reason).toEqual({ code: "step_up", fromKg: 60, toKg: 62.5 });
  });

  it("takes smaller steps: no double jump, and 2.5 kg on lower-body lifts", () => {
    const good = [session(3, 80, [10, 10, 10], "EASY"), session(6, 80, [10, 10, 10], "EASY")];
    expect(ask({ lifter: flagged, exercise: SQUAT, history: good }).weightKg).toBe(82.5);
    expect(ask({ exercise: SQUAT, history: good }).weightKg).toBe(90);
  });

  it("stays further from failure when estimating a weight", () => {
    const heavy = { sets: 4, repMin: 4, repMax: 6 };
    const history = [session(3, 60, [10, 10, 10])];
    expect(ask({ lifter: flagged, history, target: heavy }).weightKg).toBeLessThan(
      ask({ history, target: heavy }).weightKg!,
    );
  });
});

describe("bodyweight progression", () => {
  const range = { sets: 3, repMin: 8, repMax: 15 };

  it("chases reps, then asks for a harder variation", () => {
    const building = ask({
      exercise: PUSHUP,
      target: range,
      history: [session(3, null, [12, 10, 9], "RIGHT", range)],
    });
    expect(building).toMatchObject({ weightKg: null, reason: { code: "bodyweight_reps", reps: 10 } });

    const maxed = ask({
      exercise: PUSHUP,
      target: range,
      history: [session(3, null, [15, 15, 15], "RIGHT", range)],
    });
    expect(maxed.reason.code).toBe("bodyweight_harder");
  });

  it("aims for the bottom of the range after a miss", () => {
    const missed = ask({
      exercise: PUSHUP,
      target: range,
      history: [session(3, null, [8, 6, 5], "HARD", range)],
    });
    expect(missed.reason).toEqual({ code: "bodyweight_reps", reps: 8 });
  });
});

describe("adjusting inside a session", () => {
  const base = {
    weightKg: 40,
    reps: 10,
    target: TARGET,
    effort: null,
    calibration: false,
    loadType: "barbell",
    settings: METRIC,
    needsClearance: false,
  } as const;

  it("raises the remaining sets when a calibration set was easy", () => {
    const result = adjustAfterSet({ ...base, calibration: true, effort: "EASY" });
    expect(result.code).toBe("set_easy");
    expect(result.weightKg).toBeGreaterThan(40);
    // Capped at 20% however easy it was.
    expect(result.weightKg).toBeLessThanOrEqual(48);

    const careful = adjustAfterSet({ ...base, calibration: true, effort: "EASY", needsClearance: true });
    expect(careful.weightKg).toBeGreaterThan(40);
    expect(careful.weightKg).toBeLessThanOrEqual(result.weightKg);
  });

  it("keeps the weight when it felt right, lowers it when it was too hard", () => {
    expect(adjustAfterSet({ ...base, calibration: true, effort: "RIGHT" })).toEqual({
      weightKg: 40,
      code: "keep",
    });
    expect(adjustAfterSet({ ...base, calibration: true, effort: "HARD" })).toEqual({
      weightKg: 37.5,
      code: "set_hard",
    });
  });

  it("only acts on effort in a calibration session", () => {
    expect(adjustAfterSet({ ...base, effort: "EASY" }).code).toBe("keep");
  });

  it("lowers the next set after missing the bottom of the range, in any session", () => {
    const result = adjustAfterSet({ ...base, weightKg: 60, reps: 4 });
    expect(result.code).toBe("set_missed");
    // 60 x 4 is a 68 kg max; sets of 8-10 fit near 51 kg, rounded down.
    expect(result.weightKg).toBe(50);
    // A near miss still drops at least one step.
    expect(adjustAfterSet({ ...base, weightKg: 60, reps: 7 }).weightKg).toBeLessThanOrEqual(57.5);
    // Nothing lighter than the bar.
    expect(adjustAfterSet({ ...base, weightKg: 20, reps: 3 })).toEqual({ weightKg: 20, code: "keep" });
  });

  it("moves dumbbells and stacks by their own steps", () => {
    const dumbbell = adjustAfterSet({
      ...base,
      weightKg: 10,
      loadType: "dumbbell",
      calibration: true,
      effort: "HARD",
    });
    expect(dumbbell.weightKg).toBe(8);
    const stack = adjustAfterSet({
      ...base,
      weightKg: 40,
      loadType: "machine",
      calibration: true,
      effort: "EASY",
    });
    expect(stack.weightKg).toBe(45);
  });
});

describe("warm-up sets", () => {
  it("ramps up to the first compound: bar x 10, 50% x 5, 75% x 3", () => {
    expect(warmupSets(100, "barbell", METRIC)).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 50, reps: 5 },
      { weightKg: 75, reps: 3 },
    ]);
  });

  it("skips the ramp when the working weight is close to the bar", () => {
    expect(warmupSets(25, "barbell", METRIC)).toEqual([]);
    // Half of 35 is under the bar, so that step is dropped.
    expect(warmupSets(35, "barbell", METRIC)).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 27.5, reps: 3 },
    ]);
  });

  it("has no bar step for dumbbells and machines, and nothing for bodyweight", () => {
    expect(warmupSets(20, "dumbbell", METRIC)).toEqual([
      { weightKg: 10, reps: 5 },
      { weightKg: 16, reps: 3 },
    ]);
    expect(warmupSets(4, "dumbbell", METRIC)).toEqual([]);
    expect(warmupSets(null, "bodyweight", METRIC)).toEqual([]);
  });

  it("is only attached to the first compound of the day", () => {
    const history = [session(3, 97.5, [10, 10, 10])];
    expect(ask({ history, firstCompound: true }).warmups).toHaveLength(3);
    expect(ask({ history }).warmups).toEqual([]);
  });
});

describe("reason messages", () => {
  it("has three coach lines for every reason in both languages", () => {
    for (const messages of [en, ar]) {
      expect(Object.keys(messages.Coach.reasons).sort()).toEqual([...REASON_CODES].sort());
      for (const variants of Object.values(messages.Coach.reasons)) {
        expect(Object.keys(variants)).toEqual(["0", "1", "2"]);
      }
    }
  });

  it("uses the same placeholders in Arabic and English", () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const code of REASON_CODES) {
      for (const index of ["0", "1", "2"] as const) {
        const english = placeholders(en.Coach.reasons[code][index]);
        expect(placeholders(ar.Coach.reasons[code][index]), `${code}.${index}`).toEqual(
          expect.arrayContaining(english),
        );
      }
    }
  });
});
