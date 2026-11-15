import { kgToLb, lbToKg } from "@/lib/units";
import { LOAD_GRID } from "./config";
import type { LoadSettings, LoadType } from "./types";

type Loaded = Exclude<LoadType, "bodyweight">;

/** Loadable weights for one kind of equipment: multiples of `stepKg`, from `minKg` up. */
export type Grid = { stepKg: number; minKg: number };

/** What this lifter can load on this kind of equipment. */
export function gridFor(loadType: Loaded, settings: LoadSettings): Grid {
  if (settings.unitSystem === "IMPERIAL") {
    const grid = LOAD_GRID.IMPERIAL;
    const { step, min } =
      loadType === "barbell" || loadType === "ez_bar" || loadType === "dumbbell"
        ? grid[loadType]
        : grid.stack;
    return { stepKg: lbToKg(step), minKg: lbToKg(min) };
  }
  if (loadType === "barbell" || loadType === "ez_bar") {
    const { step, min } = LOAD_GRID.METRIC[loadType];
    return { stepKg: step, minKg: min };
  }
  const stepKg = loadType === "dumbbell" ? settings.dumbbellStepKg : settings.machineStepKg;
  // The lightest dumbbell, or the first plate of the stack.
  return { stepKg, minKg: stepKg };
}

// Floating point: 22.5 / 2.5 must count as exactly 9 steps.
const EPSILON = 1e-6;
const tidy = (kg: number) => Math.round(kg * 1000) / 1000;

function snap(weightKg: number, grid: Grid, mode: "nearest" | "down" | "up"): number {
  const steps = weightKg / grid.stepKg;
  const whole =
    mode === "nearest"
      ? Math.round(steps)
      : mode === "down"
        ? Math.floor(steps + EPSILON)
        : Math.ceil(steps - EPSILON);
  return tidy(Math.max(grid.minKg, whole * grid.stepKg));
}

/**
 * The nearest weight the lifter can actually load, never below the lightest
 * option (the empty bar, the lightest dumbbell, the first plate of a stack).
 */
export function roundLoad(
  weightKg: number,
  loadType: Loaded,
  settings: LoadSettings,
  mode: "nearest" | "down" | "up" = "nearest",
): number {
  return snap(weightKg, gridFor(loadType, settings), mode);
}

/** The next loadable weight above `weightKg`, at least `minIncreaseKg` heavier. */
export function stepUp(
  weightKg: number,
  loadType: Loaded,
  settings: LoadSettings,
  minIncreaseKg = 0,
): number {
  const grid = gridFor(loadType, settings);
  const next = snap(weightKg + grid.stepKg, grid, "down");
  return Math.max(next, snap(weightKg + minIncreaseKg, grid, "up"));
}

/** The next loadable weight below `weightKg`, or the lightest option. */
export function stepDown(weightKg: number, loadType: Loaded, settings: LoadSettings): number {
  const grid = gridFor(loadType, settings);
  return snap(weightKg - grid.stepKg, grid, "up");
}

/** A stored weight in the lifter's unit, rounded for display: 61.235 kg reads 135 lb. */
export function displayWeight(weightKg: number, settings: Pick<LoadSettings, "unitSystem">): number {
  const value = settings.unitSystem === "IMPERIAL" ? kgToLb(weightKg) : weightKg;
  return Math.round(value * 100) / 100;
}
