// Display formatting shared by server and client components.

import type { UnitSystem } from "@/lib/profile-options";
import { kgToLb, lbToKg } from "@/lib/units";

/** A stored kg weight as a number in the user's unit: 61.235 kg reads 135 (lb). */
export function weightValue(weightKg: number, unitSystem: UnitSystem): number {
  // Two decimals keep 1.25 kg plates exact. Pounds get one: enough for
  // 2.5 lb plates, and a weight logged in kg reads 159.8 lb, not 159.84.
  return unitSystem === "IMPERIAL"
    ? roundedWeightValue(weightKg, unitSystem, 1)
    : Math.round(weightKg * 100) / 100;
}

/**
 * A stored kg amount in the user's unit, rounded AFTER the conversion.
 * Rounding the kilograms first leaves pounds like 15996.74.
 */
export function roundedWeightValue(
  weightKg: number,
  unitSystem: UnitSystem,
  decimals = 0,
): number {
  const value = unitSystem === "IMPERIAL" ? kgToLb(weightKg) : weightKg;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** A total or an estimate: "7256 kg", "15997 lb", "227.7 lb". */
export function formatRounded(
  weightKg: number,
  unitSystem: UnitSystem,
  units: { kg: string; lb: string },
  decimals = 0,
): string {
  const unit = unitSystem === "IMPERIAL" ? units.lb : units.kg;
  return `${roundedWeightValue(weightKg, unitSystem, decimals)} ${unit}`;
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
