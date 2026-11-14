import { round } from "./units";

export type BmiCategory = "underweight" | "healthy" | "overweight" | "obese";

// WHO adult cut-offs.
const UNDERWEIGHT_BELOW = 18.5;
const HEALTHY_BELOW = 25;
const OVERWEIGHT_BELOW = 30;

/** Scale shown on the BMI gauge. Values outside are pinned to the ends. */
export const BMI_SCALE = { min: 15, max: 40 } as const;

export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  const meters = heightCm / 100;
  return round(weightKg / (meters * meters), 1);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < UNDERWEIGHT_BELOW) return "underweight";
  if (bmi < HEALTHY_BELOW) return "healthy";
  if (bmi < OVERWEIGHT_BELOW) return "overweight";
  return "obese";
}

/** Position of a BMI on the gauge, from 0 to 100. */
export function bmiGaugePercent(bmi: number): number {
  const { min, max } = BMI_SCALE;
  const clamped = Math.min(max, Math.max(min, bmi));
  return round(((clamped - min) / (max - min)) * 100, 1);
}
