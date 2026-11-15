import { BASELINE_LIFTS, type BaselineLift } from "@/lib/profile-options";
import {
  AGE_FACTORS,
  BODYWEIGHT_CLAMP_KG,
  BODYWEIGHT_RATIOS,
  CAUTIOUS_FACTOR,
  EXPERIENCE_MARGIN,
  EXPERIENCE_STRENGTH,
  FEMALE_FACTOR,
  LEVEL_MARGIN,
  LEVEL_STRENGTH,
  LIFT_RATIOS,
  START_FACTOR,
} from "./config";
import { epley, percentForRange } from "./e1rm";
import type { ExerciseProfile } from "./exercise-profile";
import { roundLoad } from "./rounding";
import type { KnownLifts, Lifter, LoadSettings, ReasonCode, Target } from "./types";

/** Where a strength estimate came from, best first. */
export type EstimateSource = "baseline" | "related" | "bodyweight";

/** One-rep maxes the lifter has shown: logged sessions win over onboarding answers. */
function knownMaxes(known: KnownLifts): Partial<Record<BaselineLift, number>> {
  const maxes: Partial<Record<BaselineLift, number>> = {};
  for (const lift of BASELINE_LIFTS) {
    const logged = known.logged?.[lift];
    const told = known.baselines?.[lift];
    if (logged && logged > 0) maxes[lift] = logged;
    else if (told) maxes[lift] = epley(told.weightKg, told.reps);
  }
  return maxes;
}

function ageFactor(age: number): number {
  return AGE_FACTORS.find(([minAge]) => age >= minAge)?.[1] ?? 1;
}

/** A typical one-rep max for someone of this size, sex, age and experience. */
export function typicalMax(lift: BaselineLift, region: "upper" | "lower", lifter: Lifter): number {
  const bodyWeight = Math.min(
    BODYWEIGHT_CLAMP_KG.max,
    Math.max(BODYWEIGHT_CLAMP_KG.min, lifter.bodyWeightKg),
  );
  const experience = lifter.experience
    ? EXPERIENCE_STRENGTH[lifter.experience]
    : LEVEL_STRENGTH[lifter.level];
  const sex = lifter.gender === "FEMALE" ? FEMALE_FACTOR[region] : 1;
  return bodyWeight * BODYWEIGHT_RATIOS[lift] * experience * sex * ageFactor(lifter.age);
}

/**
 * The lifter's one-rep max on a reference lift: what they logged or told
 * us, else worked out from the lifts they did give, else a typical figure
 * for their body weight.
 */
export function estimateAnchor(
  lift: BaselineLift,
  region: "upper" | "lower",
  lifter: Lifter,
  known: KnownLifts,
): { e1rmKg: number; source: EstimateSource } {
  const maxes = knownMaxes(known);
  const direct = maxes[lift];
  if (direct) return { e1rmKg: direct, source: "baseline" };

  const others = BASELINE_LIFTS.filter((other) => maxes[other]);
  if (others.length > 0) {
    const estimates = others.map((other) => (maxes[other]! / LIFT_RATIOS[other]) * LIFT_RATIOS[lift]);
    const average = estimates.reduce((total, value) => total + value, 0) / estimates.length;
    return { e1rmKg: average, source: "related" };
  }
  return { e1rmKg: typicalMax(lift, region, lifter), source: "bodyweight" };
}

const START_REASONS: Record<EstimateSource, ReasonCode> = {
  baseline: "start_baseline",
  related: "start_related",
  bodyweight: "start_bodyweight",
};

/** First-time weight for a loaded exercise. Always on the light side. */
export function startingWeight(
  profile: ExerciseProfile & { loadType: Exclude<ExerciseProfile["loadType"], "bodyweight"> },
  target: Pick<Target, "repMin" | "repMax">,
  lifter: Lifter,
  settings: LoadSettings,
  known: KnownLifts,
): { weightKg: number; e1rmKg: number; code: ReasonCode } {
  const anchor = estimateAnchor(profile.anchor, profile.region, lifter, known);
  // Only the reference lift itself counts as "the lift you told me".
  const source: EstimateSource =
    anchor.source === "baseline" && profile.ratio !== 1 ? "related" : anchor.source;

  const e1rmKg = anchor.e1rmKg * profile.ratio;
  const margin =
    START_FACTOR[source] *
    (lifter.experience ? EXPERIENCE_MARGIN[lifter.experience] : LEVEL_MARGIN[lifter.level]) *
    (lifter.needsClearance ? CAUTIOUS_FACTOR : 1);

  const weightKg = roundLoad(
    e1rmKg * percentForRange(target.repMin, target.repMax) * margin,
    profile.loadType,
    settings,
  );
  return { weightKg, e1rmKg, code: START_REASONS[source] };
}
