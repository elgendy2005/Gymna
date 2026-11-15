import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BODY_REGIONS } from "@/components/exercise/body-map-data";
import { exerciseMediaUrl } from "@/lib/exercise-media";
import {
  EXERCISE_EQUIPMENT,
  MOVEMENT_PATTERNS,
  MUSCLES,
  REQUIREMENTS,
} from "@/lib/exercise-options";
import {
  EMPTY_FILTERS,
  filterExercises,
  filtersToQuery,
  hasActiveFilters,
  normalizeSearchText,
  parseFilters,
  type ExerciseSummary,
} from "@/lib/exercise-search";
import { buildExercises, type RawExercise } from "../../../prisma/seed/build";
import dataset from "../../../prisma/seed/data/free-exercise-db.json";
import {
  CURATED_EXERCISES,
  type CuratedExercise,
} from "../../../prisma/seed/enrichment/curated";
import { PATTERN_CONTENT } from "../../../prisma/seed/enrichment/patterns";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

const raw = dataset as unknown as RawExercise[];
const exercises = buildExercises(raw);
const curated = exercises.filter((exercise) => exercise.engineEligible);

describe("exercise seed data", () => {
  it("imports every dataset entry once", () => {
    expect(exercises).toHaveLength(raw.length);
    expect(new Set(exercises.map((exercise) => exercise.slug)).size).toBe(raw.length);
  });

  it("uses slugs that are safe in URLs and folder names", () => {
    for (const { slug } of exercises) expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("gives every exercise a main muscle", () => {
    for (const exercise of exercises) {
      expect(exercise.primaryMuscles.length, exercise.slug).toBeGreaterThan(0);
    }
  });

  it("has English instructions for all but a known few", () => {
    // The dataset ships these without steps; the detail page hides the section.
    const empty = exercises.filter((exercise) => exercise.instructionsEn.length === 0);
    expect(empty.map((exercise) => exercise.slug)).toEqual([
      "Iron_Cross",
      "One-Arm_Kettlebell_Swings",
      "Push_Press",
      "Side_Jackknife",
    ]);
    expect(empty.some((exercise) => exercise.engineEligible)).toBe(false);
  });

  it("marks only the curated set as usable by the program engine", () => {
    expect(curated).toHaveLength(CURATED_EXERCISES.length);
    expect(curated.length).toBeGreaterThanOrEqual(110);
    for (const exercise of exercises) {
      expect(exercise.movementPattern !== null, exercise.slug).toBe(
        exercise.engineEligible,
      );
    }
  });

  it("gives every curated exercise Arabic text, coaching notes and a demo", () => {
    const arabic = /[؀-ۿ]/;
    for (const exercise of curated) {
      expect(exercise.nameAr, exercise.slug).toMatch(arabic);
      expect(exercise.instructionsAr.length, exercise.slug).toBeGreaterThanOrEqual(3);
      expect(exercise.mistakesAr.length, exercise.slug).toBeGreaterThan(0);
      expect(exercise.mistakesEn.length, exercise.slug).toBeGreaterThan(0);
      expect(exercise.breathingAr, exercise.slug).toBeTruthy();
      expect(exercise.breathingEn, exercise.slug).toBeTruthy();
      expect(exercise.frames.length, exercise.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("has the demo frames of every curated exercise on disk", () => {
    const mediaRoot = fileURLToPath(
      new URL("../../../public/exercise-media/", import.meta.url),
    );
    const missing = curated
      .flatMap((exercise) => exercise.frames)
      .filter((frame) => !existsSync(`${mediaRoot}${frame}`));
    expect(missing).toEqual([]);
  });

  it("does not reuse an Arabic name", () => {
    const names = curated.map((exercise) => exercise.nameAr);
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });

  it("covers every movement pattern with at least two exercises", () => {
    for (const pattern of MOVEMENT_PATTERNS) {
      const count = curated.filter((e) => e.movementPattern === pattern).length;
      expect(count, pattern).toBeGreaterThanOrEqual(2);
    }
  });

  it("offers bodyweight or dumbbell options for the main patterns", () => {
    const home = ["squat", "hinge", "lunge", "horizontal_push", "horizontal_pull", "core"];
    for (const pattern of home) {
      const options = curated.filter(
        (e) =>
          e.movementPattern === pattern &&
          (e.equipment === "BODYWEIGHT" || e.equipment === "DUMBBELL"),
      );
      expect(options.length, pattern).toBeGreaterThan(0);
    }
  });

  it("combines the pattern's health tags with the exercise's own", () => {
    const squat = curated.find((exercise) => exercise.slug === "Barbell_Squat");
    expect(squat?.contraindications).toEqual([
      "hypertension",
      "knee",
      "lower_back",
      "post_surgery",
    ]);
    for (const exercise of curated) {
      const pattern = PATTERN_CONTENT[exercise.movementPattern!];
      for (const tag of pattern.avoid) {
        expect(exercise.contraindications, exercise.slug).toContain(tag);
      }
    }
  });

  it("only uses values the app has labels for", () => {
    for (const exercise of exercises) {
      expect(EXERCISE_EQUIPMENT).toContain(exercise.equipment);
      for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
        expect(MUSCLES).toContain(muscle);
      }
      for (const requirement of exercise.requirements) {
        expect(REQUIREMENTS).toContain(requirement);
      }
      for (const tag of exercise.contraindications) {
        expect(Object.keys(en.Exercises.tags), exercise.slug).toContain(tag);
      }
    }
  });

  it("rejects curated entries that are missing from the dataset or repeated", () => {
    const entry: CuratedExercise = {
      slug: "No_Such_Exercise",
      pattern: "squat",
      nameAr: "x",
      cuesAr: [],
    };
    expect(() => buildExercises(raw, [entry])).toThrow(/not in the dataset/);
    const real = { ...entry, slug: "Barbell_Squat" };
    expect(() => buildExercises(raw, [real, real])).toThrow(/listed twice/);
  });
});

describe("translations", () => {
  const keys = (value: object, prefix = ""): string[] =>
    Object.entries(value).flatMap(([key, child]) =>
      typeof child === "object" ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`],
    );

  it("has the same keys in Arabic and English", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it("labels every muscle, equipment type and requirement", () => {
    for (const messages of [en, ar]) {
      expect(Object.keys(messages.Exercises.muscles).sort()).toEqual([...MUSCLES].sort());
      expect(Object.keys(messages.Exercises.equipment).sort()).toEqual(
        [...EXERCISE_EQUIPMENT].sort(),
      );
      expect(Object.keys(messages.Exercises.requirements).sort()).toEqual(
        [...REQUIREMENTS].sort(),
      );
    }
  });
});

describe("muscle map", () => {
  it("can highlight every muscle except none", () => {
    const drawn = new Set(
      [...BODY_REGIONS.front, ...BODY_REGIONS.back].flatMap((region) => region.muscles),
    );
    expect(MUSCLES.filter((muscle) => !drawn.has(muscle))).toEqual([]);
  });
});

describe("exercise media", () => {
  it("resolves stored paths under the media folder", () => {
    expect(exerciseMediaUrl("Barbell_Squat/0.webp")).toBe(
      "/exercise-media/Barbell_Squat/0.webp",
    );
  });

  it("leaves absolute URLs alone", () => {
    const url = "https://cdn.example.com/squat.mp4";
    expect(exerciseMediaUrl(url)).toBe(url);
  });
});

describe("exercise search", () => {
  const summary = (
    slug: string,
    nameAr: string | null,
    extra: Partial<ExerciseSummary> = {},
  ): ExerciseSummary => ({
    slug,
    nameEn: slug.replace(/_/g, " "),
    nameAr,
    equipment: "BARBELL",
    difficulty: "BEGINNER",
    primaryMuscles: ["quadriceps"],
    curated: true,
    thumb: null,
    ...extra,
  });

  const list = [
    summary("Barbell_Squat", "سكوات بالبار"),
    summary("Dumbbell_Bench_Press", "ضغط الصدر بالدمبل", {
      equipment: "DUMBBELL",
      primaryMuscles: ["chest"],
    }),
    summary("Pull-Ups", "عقلة", {
      equipment: "BODYWEIGHT",
      difficulty: "INTERMEDIATE",
      primaryMuscles: ["lats"],
    }),
    summary("Ankle_Circles", null, { equipment: "BODYWEIGHT", curated: false }),
  ];
  const slugs = (filters: Partial<typeof EMPTY_FILTERS>) =>
    filterExercises(list, { ...EMPTY_FILTERS, ...filters }).map((e) => e.slug);

  it("returns everything, in order, with no filters", () => {
    expect(slugs({})).toEqual(list.map((exercise) => exercise.slug));
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("matches English names whatever the case or punctuation", () => {
    expect(slugs({ query: "BENCH press" })).toEqual(["Dumbbell_Bench_Press"]);
    expect(slugs({ query: "pull ups" })).toEqual(["Pull-Ups"]);
    expect(slugs({ query: "press bench" })).toEqual(["Dumbbell_Bench_Press"]);
  });

  it("matches Arabic names across spelling variants and diacritics", () => {
    expect(slugs({ query: "عقله" })).toEqual(["Pull-Ups"]);
    expect(slugs({ query: "ضَغْط" })).toEqual(["Dumbbell_Bench_Press"]);
    expect(normalizeSearchText("أإآ ى ة")).toBe("ااا ي ه");
  });

  it("requires every word to match", () => {
    expect(slugs({ query: "barbell press" })).toEqual([]);
  });

  it("combines the muscle, equipment and level filters", () => {
    expect(slugs({ muscle: "chest" })).toEqual(["Dumbbell_Bench_Press"]);
    expect(slugs({ equipment: "BODYWEIGHT" })).toEqual(["Pull-Ups", "Ankle_Circles"]);
    expect(slugs({ equipment: "BODYWEIGHT", level: "INTERMEDIATE" })).toEqual(["Pull-Ups"]);
    expect(slugs({ muscle: "chest", equipment: "BARBELL" })).toEqual([]);
  });

  it("round-trips filters through the query string", () => {
    const filters = {
      query: "ضغط الصدر",
      muscle: "chest",
      equipment: "DUMBBELL",
      level: "BEGINNER",
    } as const;
    expect(parseFilters(new URLSearchParams(filtersToQuery(filters)))).toEqual(filters);
    expect(filtersToQuery(EMPTY_FILTERS)).toBe("");
  });

  it("ignores unknown values and over-long queries in the URL", () => {
    const parsed = parseFilters(
      new URLSearchParams(`muscle=wings&equipment=LASER&level=GOD&q=${"a".repeat(500)}`),
    );
    expect(parsed).toEqual({ ...EMPTY_FILTERS, query: "a".repeat(60) });
  });
});
