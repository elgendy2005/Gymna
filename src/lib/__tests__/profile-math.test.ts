import { describe, expect, it } from "vitest";
import { bmiCategory, bmiGaugePercent, calculateBmi } from "@/lib/bmi";
import { assessHealth, emptyHealthAnswers, flaggedQuestions } from "@/lib/health";
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
  round,
} from "@/lib/units";
import { onboardingSchema } from "@/lib/validation/onboarding";

describe("units", () => {
  it("converts weight both ways", () => {
    expect(round(kgToLb(80), 1)).toBe(176.4);
    expect(round(lbToKg(176.4), 1)).toBe(80);
  });

  it("converts height to feet and inches", () => {
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 });
    expect(round(feetInchesToCm(5, 11), 1)).toBe(180.3);
  });

  it("never reports 12 inches", () => {
    expect(cmToFeetInches(182.9)).toEqual({ feet: 6, inches: 0 });
  });
});

describe("bmi", () => {
  it("calculates to one decimal", () => {
    expect(calculateBmi(80, 180)).toBe(24.7);
  });

  it("returns null for missing or invalid input", () => {
    expect(calculateBmi(0, 180)).toBeNull();
    expect(calculateBmi(80, Number.NaN)).toBeNull();
  });

  it("uses the WHO boundaries", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
    expect(bmiCategory(18.5)).toBe("healthy");
    expect(bmiCategory(24.9)).toBe("healthy");
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(30)).toBe("obese");
  });

  it("pins the gauge to its ends", () => {
    expect(bmiGaugePercent(10)).toBe(0);
    expect(bmiGaugePercent(27.5)).toBe(50);
    expect(bmiGaugePercent(60)).toBe(100);
  });
});

describe("health screening", () => {
  it("needs no clearance when every answer is no", () => {
    expect(assessHealth(emptyHealthAnswers())).toEqual({
      needsClearance: false,
      contraindications: [],
    });
  });

  it("maps injuries to exercise tags", () => {
    const answers = { ...emptyHealthAnswers(), knee: true, lowerBack: true };
    expect(flaggedQuestions(answers)).toEqual(["lowerBack", "knee"]);
    expect(assessHealth(answers)).toEqual({
      needsClearance: true,
      contraindications: ["knee", "lower_back"],
    });
  });

  it("does not repeat tags shared by two conditions", () => {
    const answers = {
      ...emptyHealthAnswers(),
      heartCondition: true,
      chestPain: true,
    };
    expect(assessHealth(answers).contraindications).toEqual([
      "cardiac",
      "high_intensity",
    ]);
  });

  it("asks for clearance for diabetes even without movement tags", () => {
    const answers = { ...emptyHealthAnswers(), diabetes: true };
    expect(assessHealth(answers)).toEqual({
      needsClearance: true,
      contraindications: [],
    });
  });
});

describe("onboarding schema", () => {
  const valid = {
    unitSystem: "METRIC",
    age: 28,
    gender: "MALE",
    heightCm: 178,
    weightKg: 82,
    goal: "MUSCLE_GAIN",
    level: "BEGINNER",
    daysPerWeek: 4,
    sessionMinutes: 60,
    equipment: "FULL_GYM",
    health: emptyHealthAnswers(),
    notes: "",
    disclaimerAccepted: true,
  };

  it("accepts a complete answer set", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects out-of-range and unsupported values", () => {
    expect(onboardingSchema.safeParse({ ...valid, age: 12 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, daysPerWeek: 7 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, sessionMinutes: 50 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, heightCm: 20 }).success).toBe(false);
  });

  it("requires the disclaimer to be accepted", () => {
    const result = onboardingSchema.safeParse({ ...valid, disclaimerAccepted: false });
    expect(result.success).toBe(false);
  });

  it("requires an answer to every health question", () => {
    const health: Record<string, boolean> = { ...valid.health };
    delete health.knee;
    expect(onboardingSchema.safeParse({ ...valid, health }).success).toBe(false);
  });
});
