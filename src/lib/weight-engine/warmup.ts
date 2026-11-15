import {
  WARMUP_BAR_REPS,
  WARMUP_MIN_BAR_MULTIPLE,
  WARMUP_MIN_STEPS,
  WARMUP_STEPS,
} from "./config";
import { gridFor, roundLoad } from "./rounding";
import type { LoadSettings, LoadType, WarmupSet } from "./types";

/**
 * Ramp-up sets before the first heavy lift of the day: the empty bar, then
 * half and three quarters of the working weight. Skipped when the working
 * weight is already close to the lightest option.
 */
export function warmupSets(
  workingKg: number | null,
  loadType: LoadType,
  settings: LoadSettings,
): WarmupSet[] {
  if (workingKg === null || loadType === "bodyweight") return [];

  const grid = gridFor(loadType, settings);
  const hasBar = loadType === "barbell" || loadType === "ez_bar";
  const enough = hasBar
    ? workingKg >= grid.minKg * WARMUP_MIN_BAR_MULTIPLE
    : workingKg >= grid.stepKg * WARMUP_MIN_STEPS;
  if (!enough) return [];

  const sets: WarmupSet[] = hasBar ? [{ weightKg: grid.minKg, reps: WARMUP_BAR_REPS }] : [];
  for (const [share, reps] of WARMUP_STEPS) {
    const weightKg = roundLoad(workingKg * share, loadType, settings);
    const heaviest = sets[sets.length - 1]?.weightKg ?? 0;
    // Each step must be a real step: above the last one, below the work.
    if (weightKg > heaviest && weightKg < workingKg) sets.push({ weightKg, reps });
  }
  return sets;
}
