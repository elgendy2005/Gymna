// Rule-based weight engine: turns a lifter's history into the weight and
// reps for the next session of an exercise, with the reason for it. Pure
// functions with no database or framework imports. Weights are always kg;
// dumbbell weights are per dumbbell.

import { exerciseProfile } from "./exercise-profile";
import { progressBodyweight, progressLoaded } from "./progress";
import { startingWeight } from "./start";
import type {
  KnownLifts,
  Lifter,
  LoadSettings,
  PastSession,
  Recommendation,
  Target,
  WeightExercise,
} from "./types";
import { warmupSets } from "./warmup";

export type RecommendInput = {
  exercise: WeightExercise;
  target: Target;
  lifter: Lifter;
  settings: LoadSettings;
  /** Past sessions of this exercise, in any order. */
  history: readonly PastSession[];
  /** Strength on the reference lifts, used before there is any history. */
  known?: KnownLifts;
  /** True for the first compound lift of the day, which gets warm-up sets. */
  firstCompound?: boolean;
  now?: Date;
};

/** The weight, reps and reason for the next session of one exercise. */
export function recommend(input: RecommendInput): Recommendation {
  const { exercise, target, lifter, settings, history } = input;
  const profile = exerciseProfile(exercise);
  const range = { repMin: target.repMin, repMax: target.repMax };

  if (profile.loadType === "bodyweight") {
    const { reason } = progressBodyweight(history, target);
    return { weightKg: null, ...range, reason, calibration: false, deload: false, warmups: [] };
  }

  const loaded = { ...profile, loadType: profile.loadType };
  const progression = progressLoaded(
    history,
    loaded,
    exercise.isCompound,
    target,
    lifter,
    settings,
    input.now,
  );
  const warmups = (weightKg: number) =>
    input.firstCompound ? warmupSets(weightKg, loaded.loadType, settings) : [];

  if (progression && progression.weightKg !== null) {
    return {
      weightKg: progression.weightKg,
      ...range,
      reason: progression.reason,
      calibration: false,
      deload: progression.deload,
      warmups: warmups(progression.weightKg),
    };
  }

  const start = startingWeight(loaded, target, lifter, settings, input.known ?? {});
  return {
    weightKg: start.weightKg,
    ...range,
    reason: { code: start.code },
    calibration: true,
    deload: false,
    warmups: warmups(start.weightKg),
  };
}

export { adjustAfterSet, type SetAdjustment } from "./adjust";
export { bestRecentE1rm, epley, percentForRange, percentForReps, sessionE1rm } from "./e1rm";
export { ANCHOR_EXERCISES, exerciseProfile, type ExerciseProfile } from "./exercise-profile";
export { platesPerSide, type PlateBreakdown } from "./plates";
export { reviewSession, type Outcome, type SessionReview } from "./progress";
export { displayWeight, gridFor, roundLoad, stepDown, stepUp } from "./rounding";
export { estimateAnchor, typicalMax } from "./start";
export { warmupSets } from "./warmup";
export * from "./types";
