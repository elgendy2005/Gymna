// Display formatting shared by server and client components.

import type { UnitSystem } from "@/lib/profile-options";
import { kgToLb, lbToKg } from "@/lib/units";

/** A stored kg weight as a number in the user's unit: 61.235 kg reads 135 (lb). */
export function weightValue(weightKg: number, unitSystem: UnitSystem): number {
  const value = unitSystem === "IMPERIAL" ? kgToLb(weightKg) : weightKg;
  // Two decimals keep 1.25 kg plates exact and hide lb conversion noise.
  return Math.round(value * 100) / 100;
}

/** A number typed in the user's unit as kg for storage. */
export function weightToKg(value: number, unitSystem: UnitSystem): number {
  const kg = unitSystem === "IMPERIAL" ? lbToKg(value) : value;
  return Math.round(kg * 1000) / 1000;
}

/** "42.5 kg" or "135 lb". `units` are the translated unit labels. */
export function formatWeight(
  weightKg: number,
  unitSystem: UnitSystem,
  units: { kg: string; lb: string },
): string {
  const unit = unitSystem === "IMPERIAL" ? units.lb : units.kg;
  return `${weightValue(weightKg, unitSystem)} ${unit}`;
}

/** "1:30" for 90 seconds, "1:02:05" past an hour. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}
