import { FOCUS_AREA_MUSCLES, type MovementPattern, type Muscle } from "@/lib/exercise-options";
import type { FocusArea } from "@/lib/profile-options";
import { focusMuscles, pickForSlot, scoreExercise, type ScoreContext } from "./select";
import { DAY_PATTERNS, templateFor, type Slot } from "./templates";
import type { DayType, EngineExercise, EngineProfile, PlannedExercise, Role } from "./types";
import { CAUTIOUS, MAX_SETS, MIN_SETS, estimateMinutes, prescribe } from "./volume";

/** A planned exercise plus what the builder needs while it is still shaping the day. */
export type Draft = PlannedExercise & { keep: Slot["keep"]; primaryMuscles: readonly Muscle[] };

/** Below this a session is not worth the trip; thin days are topped up. */
const MIN_EXERCISES = 4;
/** Trimming for time stops here and shortens sets instead. */
const MIN_EXERCISES_WHEN_SHORT = 3;

function draft(exercise: EngineExercise, role: Role, keep: Slot["keep"], profile: EngineProfile): Draft {
  return {
    slug: exercise.slug,
    pattern: exercise.movementPattern as MovementPattern,
    role,
    ...prescribe(exercise, role, profile),
    focusExtra: false,
    keep,
    primaryMuscles: exercise.primaryMuscles,
  };
}

/** Core work goes last whatever order it was added in. */
function coreLast(drafts: Draft[]): Draft[] {
  return [...drafts.filter((item) => item.role !== "core"), ...drafts.filter((item) => item.role === "core")];
}

/** Fills the day's template from the pool of exercises this user can do. */
export function fillDay(
  type: DayType,
  occurrence: number,
  dayIndex: number,
  profile: EngineProfile,
  pool: readonly EngineExercise[],
  usedThisWeek: ReadonlyMap<string, number>,
): Draft[] {
  const usedToday = new Set<string>();
  const drafts: Draft[] = [];
  const context = (role: Role): ScoreContext => ({
    profile,
    role,
    usedThisWeek,
    salt: String(dayIndex),
  });

  for (const slot of templateFor(type, occurrence)) {
    const exercise = pickForSlot(slot.patterns, pool, usedToday, context(slot.role));
    if (!exercise) continue;
    usedToday.add(exercise.slug);
    // A slot that fell back to a single-joint move is no longer the main lift.
    const role = slot.role === "main" && !exercise.isCompound ? "accessory" : slot.role;
    drafts.push(draft(exercise, role, slot.keep, profile));
  }

  // Limited equipment or several health flags can leave slots empty. Top the
  // day up with whatever else fits this day type.
  for (const pattern of DAY_PATTERNS[type]) {
    if (drafts.length >= MIN_EXERCISES) break;
    const role: Role = pattern === "core" ? "core" : "accessory";
    const exercise = pickForSlot([pattern], pool, usedToday, context(role));
    if (!exercise) continue;
    usedToday.add(exercise.slug);
    drafts.push(draft(exercise, exercise.isCompound && role !== "core" ? "compound" : role, 3, profile));
  }

  return coreLast(drafts);
}

function matchesFocus(item: Draft, profile: EngineProfile): boolean {
  const muscles = focusMuscles(profile);
  return item.primaryMuscles.some((muscle) => muscles.has(muscle));
}

/**
 * Shortens a day until it fits the session length: drops the least
 * important exercises first (never those for a focus area while others
 * remain), then takes sets off.
 */
export function fitToTime(drafts: Draft[], profile: EngineProfile): Draft[] {
  let day = drafts.map((item) => ({ ...item }));
  const over = () => estimateMinutes(day) > profile.sessionMinutes;

  while (over() && day.length > MIN_EXERCISES_WHEN_SHORT) {
    const dropOrder = day
      .map((item, index) => ({
        index,
        // Bigger goes first: low priority, not a focus area, late in the day.
        rank: item.keep * 100 - (matchesFocus(item, profile) ? 50 : 0) + index,
      }))
      .sort((a, b) => b.rank - a.rank);
    day = day.filter((_, index) => index !== dropOrder[0].index);
  }

  while (over()) {
    const target = day
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.sets > MIN_SETS)
      .sort((a, b) => b.item.sets - a.item.sets || b.index - a.index)[0];
    if (!target) break;
    target.item.sets -= 1;
  }

  // Still too long with every exercise at its minimum: a very short session.
  while (over() && day.length > 2) day = day.slice(0, -1);
  return day;
}

// Single-joint patterns first: an extra exercise for a focus area should add
// work for that area without adding much fatigue.
const FOCUS_PATTERNS: Record<FocusArea, readonly MovementPattern[]> = {
  arms: ["biceps", "triceps"],
  chest: ["chest_fly", "horizontal_push"],
  back: ["vertical_pull", "horizontal_pull", "shrug"],
  shoulders: ["lateral_raise", "rear_delt", "vertical_push"],
  legs: ["leg_extension", "leg_curl", "calves", "lunge"],
  glutes: ["glutes", "hinge"],
  abs: ["core"],
};

/** Days a focus area may get an extra set on. */
const FOCUS_SET_DAYS = 2;

/**
 * Gives each focus area a little more weekly work without changing the
 * split: one more set on up to two days, plus one extra exercise on the day
 * with the most time to spare. Nothing is added past the session length; on
 * a full day a set moves over from the least important other exercise.
 */
export function applyFocus(
  days: Draft[][],
  types: readonly DayType[],
  profile: EngineProfile,
  pool: readonly EngineExercise[],
): Draft[][] {
  const result = days.map((day) => day.map((item) => ({ ...item })));
  const fits = (day: Draft[]) => estimateMinutes(day) <= profile.sessionMinutes;
  const maxSets = profile.needsClearance ? CAUTIOUS.maxSets : MAX_SETS;

  for (const area of profile.focusAreas) {
    const muscles = FOCUS_AREA_MUSCLES[area].muscles;
    const inArea = (item: Draft) => item.primaryMuscles.some((muscle) => muscles.includes(muscle));

    // 1. One more set on the first exercise for the area, on up to two days.
    let boosted = 0;
    for (const day of result) {
      if (boosted >= FOCUS_SET_DAYS) break;
      const target = day.find((item) => inArea(item) && item.sets < maxSets);
      if (!target) continue;

      target.sets += 1;
      if (fits(day)) {
        target.focusExtra = true;
        boosted += 1;
        continue;
      }
      // No room: move a set over from the last exercise that is not a focus.
      const donor = [...day]
        .reverse()
        .find((item) => !matchesFocus(item, profile) && item.role !== "main" && item.sets > MIN_SETS);
      if (donor) {
        donor.sets -= 1;
        if (fits(day)) {
          target.focusExtra = true;
          boosted += 1;
          continue;
        }
        donor.sets += 1;
      }
      target.sets -= 1;
    }

    // 2. One extra exercise where it belongs and where there is time.
    const patterns = FOCUS_PATTERNS[area];
    const candidates = result
      .map((day, index) => ({ day, index, slack: profile.sessionMinutes - estimateMinutes(day) }))
      .filter(({ index }) => patterns.some((pattern) => DAY_PATTERNS[types[index]].includes(pattern)))
      .sort((a, b) => b.slack - a.slack || a.index - b.index);

    for (const { day, index } of candidates) {
      const usedToday = new Set(day.map((item) => item.slug));
      const usedThisWeek = new Map<string, number>();
      for (const item of result.flat()) {
        usedThisWeek.set(item.slug, (usedThisWeek.get(item.slug) ?? 0) + 1);
      }
      const role: Role = area === "abs" ? "core" : "accessory";
      const context: ScoreContext = { profile, role, usedThisWeek, salt: `focus-${index}` };
      const allowed = patterns.filter((pattern) => DAY_PATTERNS[types[index]].includes(pattern));
      const options = pool
        .filter(
          (exercise) =>
            exercise.movementPattern !== null &&
            allowed.includes(exercise.movementPattern) &&
            !usedToday.has(exercise.slug) &&
            exercise.primaryMuscles.some((muscle) => muscles.includes(muscle)),
        )
        .sort((a, b) => scoreExercise(b, context) - scoreExercise(a, context) || a.slug.localeCompare(b.slug));
      if (options.length === 0) continue;

      const extra = { ...draft(options[0], role, 3, profile), focusExtra: true };
      let added = coreLast([...day, extra]);
      if (!fits(added)) {
        extra.sets = MIN_SETS;
        added = coreLast([...day, extra]);
      }
      if (!fits(added)) continue;
      result[index] = added;
      break;
    }
  }

  return result;
}
