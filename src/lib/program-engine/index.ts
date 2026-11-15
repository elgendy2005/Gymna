// Rule-based program engine: turns the onboarding answers into a weekly
// plan. Pure functions with no database or framework imports, so the same
// answers always give the same plan and everything here is unit tested.

import { applyFocus, fillDay, fitToTime, type Draft } from "./build";
import { isEligible } from "./select";
import { chooseSplit, weekDayTypes } from "./templates";
import type { EngineExercise, EngineProfile, GeneratedPlan, PlannedExercise } from "./types";
import { estimateMinutes } from "./volume";

/** Bump when the rules change in a way that should rebuild saved plans. */
export const ENGINE_VERSION = 1;

function toPlanned(item: Draft): PlannedExercise {
  return {
    slug: item.slug,
    pattern: item.pattern,
    role: item.role,
    sets: item.sets,
    repMin: item.repMin,
    repMax: item.repMax,
    restSeconds: item.restSeconds,
    focusExtra: item.focusExtra,
  };
}

/**
 * Builds the week. `exercises` is the curated set; anything the user cannot
 * or should not do is filtered out here.
 */
export function generatePlan(
  profile: EngineProfile,
  exercises: readonly EngineExercise[],
): GeneratedPlan {
  const pool = exercises.filter(
    (exercise) =>
      isEligible(exercise, profile) &&
      // With a health flag the plan has no barbell compounds: machines and
      // dumbbells are easier to load lightly and to bail out of. They stay
      // available as swaps for someone who has been cleared for them.
      !(profile.needsClearance && exercise.equipment === "BARBELL" && exercise.isCompound),
  );
  const split = chooseSplit(profile);
  const types = weekDayTypes(split, profile.daysPerWeek);

  const usedThisWeek = new Map<string, number>();
  const seenTypes = new Map<string, number>();
  let days = types.map((type, index) => {
    const occurrence = seenTypes.get(type) ?? 0;
    seenTypes.set(type, occurrence + 1);
    const day = fitToTime(fillDay(type, occurrence, index, profile, pool, usedThisWeek), profile);
    for (const item of day) usedThisWeek.set(item.slug, (usedThisWeek.get(item.slug) ?? 0) + 1);
    return day;
  });

  days = applyFocus(days, types, profile, pool);

  return {
    split,
    engineVersion: ENGINE_VERSION,
    days: days.map((day, index) => ({
      order: index,
      weekday: profile.trainingDays[index] ?? index,
      type: types[index],
      estimatedMinutes: estimateMinutes(day),
      exercises: day.map(toPlanned),
    })),
  };
}

export { alternativesFor, isEligible } from "./select";
export { chooseSplit } from "./templates";
export { estimateMinutes } from "./volume";
export * from "./types";
