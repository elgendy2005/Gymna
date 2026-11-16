import { describe, expect, it } from "vitest";
import { formatRounded, formatWeight, roundedWeightValue, weightToKg, weightValue } from "@/lib/format";

const units = { kg: "kg", lb: "lb" };

describe("weights in pounds", () => {
  it("rounds totals after converting, not before", () => {
    // 7256 kg is 15996.74 lb: the finish screen used to print that as is.
    expect(formatRounded(7256, "IMPERIAL", units)).toBe("15997 lb");
    expect(formatRounded(7256.4, "METRIC", units)).toBe("7256 kg");
    expect(formatRounded(3100, "IMPERIAL", units)).toBe("6834 lb");
  });

  it("keeps one decimal for estimated maxes", () => {
    expect(formatRounded(103.3, "IMPERIAL", units, 1)).toBe("227.7 lb");
    expect(formatRounded(103.33, "METRIC", units, 1)).toBe("103.3 kg");
    expect(roundedWeightValue(77.5, "IMPERIAL", 1)).toBe(170.9);
  });

  it("shows a weight logged in kg with one decimal", () => {
    expect(formatWeight(72.5, "IMPERIAL", units)).toBe("159.8 lb");
    expect(formatWeight(40, "IMPERIAL", units)).toBe("88.2 lb");
  });

  it("gives back exactly what was typed in pounds", () => {
    for (const lb of [5, 45, 135, 160, 227.5, 402.5]) {
      expect(weightValue(weightToKg(lb, "IMPERIAL"), "IMPERIAL")).toBe(lb);
    }
  });
});

describe("weights in kilograms", () => {
  it("keeps 1.25 kg plates exact", () => {
    expect(formatWeight(41.25, "METRIC", units)).toBe("41.25 kg");
    expect(formatWeight(72.5, "METRIC", units)).toBe("72.5 kg");
  });
});
