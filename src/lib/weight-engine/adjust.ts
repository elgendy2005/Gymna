import {
  CAUTIOUS_FACTOR,
  HARD_SET_FACTOR,
  MAX_CALIBRATION_JUMP,
  REPS_IN_RESERVE,
} from "./config";
import { epley, percentForRange } from "./e1rm";
import { roundLoad, stepDown, stepUp } from "./rounding";
import type { Effort, LoadSettings, LoadType, Target } from "./types";

export type SetAdjustment = {
  /** Weight for the sets that are left. */
  weightKg: number;
  code: "keep" | "set_easy" | "set_hard" | "set_missed";
};

/**
 * Corrects the remaining sets after one set is logged.
 *
 * - Missing the bottom of the range lowers the next set, in any session.
 * - In a calibration session the lifter says how the first set felt, and
 *   the answer moves the remaining sets up or down right away.
 */
export function adjustAfterSet(input: {
  weightKg: number;
  reps: number;
  target: Pick<Target, "repMin" | "repMax">;
  /** Only asked in a calibration session. */
  effort: Effort | null;
  calibration: boolean;
  loadType: Exclude<LoadType, "bodyweight">;
  settings: LoadSettings;
  needsClearance: boolean;
}): SetAdjustment {
  const { weightKg, reps, target, effort, loadType, settings } = input;
  const share = percentForRange(target.repMin, target.repMax);
  const keep: SetAdjustment = { weightKg, code: "keep" };

  if (reps < target.repMin) {
    // Taken to the limit and still short: that set is the strength estimate.
    const fitted = roundLoad(epley(weightKg, Math.max(reps, 1)) * share, loadType, settings, "down");
    const lower = Math.min(fitted, stepDown(weightKg, loadType, settings));
    return lower < weightKg ? { weightKg: lower, code: "set_missed" } : keep;
  }

  if (!input.calibration || !effort) return keep;

  if (effort === "EASY") {
    const cautious = input.needsClearance ? CAUTIOUS_FACTOR : 1;
    const cap = weightKg * MAX_CALIBRATION_JUMP[input.needsClearance ? "cautious" : "normal"];
    const estimate = epley(weightKg, reps + REPS_IN_RESERVE.EASY) * share * cautious;
    const fitted = roundLoad(Math.min(estimate, cap), loadType, settings, "down");
    // "Easy" always earns at least one step.
    return { weightKg: Math.max(fitted, stepUp(weightKg, loadType, settings)), code: "set_easy" };
  }

  if (effort === "HARD") {
    const lower = Math.min(
      roundLoad(weightKg * HARD_SET_FACTOR, loadType, settings, "down"),
      stepDown(weightKg, loadType, settings),
    );
    return lower < weightKg ? { weightKg: lower, code: "set_hard" } : keep;
  }

  return keep;
}
