import {
  CAUTIOUS_FACTOR,
  CAUTIOUS_GOOD_SESSIONS,
  COMPOUND_STEP,
  DELOAD_FACTOR,
  MISSES_BEFORE_REDUCE,
  REDUCE_FACTOR,
  SAME_WEIGHT_KG,
  STALL_SESSIONS,
} from "./config";
import { bestRecentE1rm, percentForRange } from "./e1rm";
import type { ExerciseProfile } from "./exercise-profile";
import { roundLoad, stepDown, stepUp } from "./rounding";
import type { Lifter, LoadSettings, PastSession, Reason, Target } from "./types";

/** How a past session went against its own targets. */
export type Outcome = "top" | "in_range" | "hard" | "missed";

export type SessionReview = {
  /** The weight most sets were done at. Null for bodyweight work. */
  weightKg: number | null;
  outcome: Outcome;
  /** Reps of the sets done at that weight. */
  reps: number[];
  totalReps: number;
};

const sameWeight = (a: number | null, b: number | null) =>
  a === null || b === null ? a === b : Math.abs(a - b) < SAME_WEIGHT_KG;

/**
 * Judges a session on the sets at its main weight. The engine follows what
 * was lifted, not what it suggested: a lifter who changed the weight, or
 * who was moved to another weight after the first set, is judged on the
 * weight they settled on.
 */
export function reviewSession(session: PastSession): SessionReview | null {
  if (session.sets.length === 0) return null;

  const groups: { weightKg: number | null; reps: number[] }[] = [];
  for (const set of session.sets) {
    const group = groups.find((item) => sameWeight(item.weightKg, set.weightKg));
    if (group) group.reps.push(set.reps);
    else groups.push({ weightKg: set.weightKg, reps: [set.reps] });
  }
  // Most sets wins; on a tie the later weight, which is the corrected one.
  const main = groups.reduce((best, group) => (group.reps.length >= best.reps.length ? group : best));

  const enoughSets = main.reps.length >= Math.max(1, session.targetSets - 1);
  const allTop = main.reps.every((reps) => reps >= session.repMax);
  const anyMissed = main.reps.some((reps) => reps < session.repMin);

  let outcome: Outcome;
  if (anyMissed) outcome = "missed";
  else if (session.feedback === "HARD") outcome = "hard";
  else if (allTop && enoughSets) outcome = "top";
  else outcome = "in_range";

  return {
    weightKg: main.weightKg,
    outcome,
    reps: main.reps,
    totalReps: main.reps.reduce((total, reps) => total + reps, 0),
  };
}

/** Reviews of the sessions that have sets, newest first. */
function reviews(history: readonly PastSession[]): { session: PastSession; review: SessionReview }[] {
  return [...history]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .flatMap((session) => {
      const review = reviewSession(session);
      return review ? [{ session, review }] : [];
    });
}

/** How many of the latest sessions in a row match, at the latest weight. */
function streak(
  items: readonly { review: SessionReview }[],
  matches: (review: SessionReview) => boolean,
): number {
  const weight = items[0].review.weightKg;
  let count = 0;
  for (const { review } of items) {
    if (!sameWeight(review.weightKg, weight) || !matches(review)) break;
    count++;
  }
  return count;
}

export type Progression = { weightKg: number | null; reason: Reason; deload: boolean };

/** The rep target to chase next time: one more than the weakest set, within the range. */
function nextReps(review: SessionReview, target: Pick<Target, "repMin" | "repMax">): number {
  return Math.min(target.repMax, Math.max(target.repMin, Math.min(...review.reps) + 1));
}

/**
 * Double progression for a loaded exercise with history: add reps until
 * every set reaches the top of the range, then add weight. Returns null
 * when no past session has any sets.
 */
export function progressLoaded(
  history: readonly PastSession[],
  profile: ExerciseProfile & { loadType: Exclude<ExerciseProfile["loadType"], "bodyweight"> },
  isCompound: boolean,
  target: Pick<Target, "repMin" | "repMax">,
  lifter: Pick<Lifter, "needsClearance">,
  settings: LoadSettings,
  now: Date = new Date(),
): Progression | null {
  const items = reviews(history).filter(({ review }) => review.weightKg !== null);
  if (items.length === 0) return null;

  const { session, review } = items[0];
  const current = review.weightKg!;
  const { loadType } = profile;
  const hold = (code: Reason["code"], extra: Partial<Reason> = {}): Progression => ({
    weightKg: roundLoad(current, loadType, settings),
    reason: { code, ...extra },
    deload: false,
  });

  // The plan now asks for different reps (the goal changed): the old weight
  // no longer fits, so work the new one out from current strength.
  if (session.repMin !== target.repMin || session.repMax !== target.repMax) {
    const e1rm = bestRecentE1rm(history, now) ?? 0;
    const cautious = lifter.needsClearance ? CAUTIOUS_FACTOR : 1;
    const weightKg = roundLoad(
      e1rm * percentForRange(target.repMin, target.repMax) * cautious,
      loadType,
      settings,
    );
    return { weightKg, reason: { code: "new_range", fromKg: current, toKg: weightKg }, deload: false };
  }

  if (review.outcome === "top") {
    const good = streak(items, (item) => item.outcome === "top");
    if (lifter.needsClearance && good < CAUTIOUS_GOOD_SESSIONS) return hold("hold_confirm");

    const steps = COMPOUND_STEP[settings.unitSystem];
    // With a health flag, lower-body lifts take the smaller step too.
    const compoundStep =
      profile.region === "lower" && !lifter.needsClearance ? steps.lowerKg : steps.upperKg;
    const easy = session.feedback === "EASY" && !lifter.needsClearance;
    const increase = isCompound ? compoundStep * (easy ? 2 : 1) : 0;
    const weightKg = stepUp(current, loadType, settings, increase);
    return {
      weightKg,
      reason: { code: easy ? "step_up_easy" : "step_up", fromKg: current, toKg: weightKg },
      deload: false,
    };
  }

  if (review.outcome === "missed") {
    const misses = streak(items, (item) => item.outcome === "missed");
    if (misses < MISSES_BEFORE_REDUCE) return hold("hold_missed");
    const weightKg = Math.min(
      roundLoad(current * REDUCE_FACTOR, loadType, settings, "down"),
      stepDown(current, loadType, settings),
    );
    // Already on the lightest option: nothing lighter to offer.
    if (weightKg >= current) return hold("hold_missed");
    return { weightKg, reason: { code: "reduce", fromKg: current, toKg: weightKg }, deload: false };
  }

  // In range or hard: the weight stays. Several sessions like that with no
  // more reps to show for it is a stall, and a lighter week breaks it.
  const stuck = streak(items, (item) => item.outcome === "in_range" || item.outcome === "hard");
  if (stuck >= STALL_SESSIONS) {
    const window = items.slice(0, STALL_SESSIONS).map((item) => item.review.totalReps);
    const noProgress = window[0] <= window[window.length - 1];
    if (noProgress) {
      const weightKg = Math.min(
        roundLoad(current * DELOAD_FACTOR, loadType, settings, "down"),
        stepDown(current, loadType, settings),
      );
      if (weightKg < current) {
        return { weightKg, reason: { code: "deload", fromKg: current, toKg: weightKg }, deload: true };
      }
    }
  }

  return review.outcome === "hard"
    ? hold("hold_hard")
    : hold("add_reps", { reps: nextReps(review, target) });
}

/**
 * Bodyweight exercises progress in reps. Once every set reaches the top of
 * the range it is time for a harder variation.
 */
export function progressBodyweight(
  history: readonly PastSession[],
  target: Pick<Target, "repMin" | "repMax">,
): Progression {
  const latest = reviews(history)[0]?.review;
  if (!latest) return { weightKg: null, reason: { code: "bodyweight_start" }, deload: false };
  if (latest.outcome === "top") {
    return { weightKg: null, reason: { code: "bodyweight_harder" }, deload: false };
  }
  return {
    weightKg: null,
    reason: { code: "bodyweight_reps", reps: nextReps(latest, target) },
    deload: false,
  };
}
