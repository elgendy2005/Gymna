import type { UnitSystem } from "@/lib/profile-options";
import { kgToLb } from "@/lib/units";
import { LOAD_GRID, PLATES } from "./config";

export type PlateBreakdown = {
  unit: "kg" | "lb";
  /** The bar, in `unit`. */
  bar: number;
  /** Plates for one side, heaviest first, in `unit`. */
  perSide: number[];
  /** What is left over when the total cannot be loaded exactly, in `unit`. */
  leftover: number;
  /** The total is lighter than the bar itself, so no loading gives it. */
  belowBar: boolean;
};

/** Which plates go on each side of the bar for a total weight. */
export function platesPerSide(
  totalKg: number,
  unitSystem: UnitSystem,
  barType: "barbell" | "ez_bar" = "barbell",
): PlateBreakdown {
  const imperial = unitSystem === "IMPERIAL";
  const bar = LOAD_GRID[unitSystem][barType].min;
  // Stored kg values of lb weights carry rounding noise; work in tidy units.
  const total = Math.round((imperial ? kgToLb(totalKg) : totalKg) * 100) / 100;

  let side = Math.max(0, (total - bar) / 2);
  const perSide: number[] = [];
  for (const plate of PLATES[unitSystem]) {
    while (side >= plate - 1e-6) {
      perSide.push(plate);
      side -= plate;
    }
  }
  return {
    unit: imperial ? "lb" : "kg",
    bar,
    perSide,
    leftover: Math.round(side * 2 * 100) / 100,
    belowBar: total < bar - 0.01,
  };
}
