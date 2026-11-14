import {
  HEALTH_QUESTIONS,
  type HealthQuestion,
} from "@/lib/health";
import type {
  Equipment,
  Gender,
  Goal,
  Level,
  UnitSystem,
} from "@/lib/profile-options";
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
  round,
} from "@/lib/units";

/**
 * Wizard state. Measurements are kept as the text the user typed in the
 * current unit system, and converted to metric by `toInput`.
 */
export type Draft = {
  unitSystem: UnitSystem;
  age: string;
  gender: Gender | null;
  heightCm: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  goal: Goal | null;
  level: Level | null;
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  equipment: Equipment | null;
  health: Record<HealthQuestion, boolean | null>;
  notes: string;
  disclaimerAccepted: boolean;
};

/** Saved answers used to prefill the wizard when editing. */
export type DraftSource = {
  unitSystem: UnitSystem;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  level: Level;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment;
  health: Record<HealthQuestion, boolean>;
  notes: string;
};

const unanswered = () =>
  Object.fromEntries(HEALTH_QUESTIONS.map((q) => [q, null])) as Draft["health"];

export function emptyDraft(): Draft {
  return {
    unitSystem: "METRIC",
    age: "",
    gender: null,
    heightCm: "",
    heightFeet: "",
    heightInches: "",
    weight: "",
    goal: null,
    level: null,
    daysPerWeek: 3,
    sessionMinutes: 60,
    equipment: null,
    health: unanswered(),
    notes: "",
    disclaimerAccepted: false,
  };
}

export function draftFrom(source: DraftSource): Draft {
  const imperial = source.unitSystem === "IMPERIAL";
  const { feet, inches } = cmToFeetInches(source.heightCm);
  return {
    unitSystem: source.unitSystem,
    age: String(source.age),
    gender: source.gender,
    heightCm: String(round(source.heightCm)),
    heightFeet: String(feet),
    heightInches: String(inches),
    weight: String(round(imperial ? kgToLb(source.weightKg) : source.weightKg, 1)),
    goal: source.goal,
    level: source.level,
    daysPerWeek: source.daysPerWeek,
    sessionMinutes: source.sessionMinutes,
    equipment: source.equipment,
    health: { ...source.health },
    notes: source.notes,
    // Asked again on every edit: the answers it covers may have changed.
    disclaimerAccepted: false,
  };
}

/** Parses typed text. Accepts a comma as the decimal mark. */
function toNumber(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function draftHeightCm(draft: Draft): number | null {
  if (draft.unitSystem === "METRIC") return toNumber(draft.heightCm);
  const feet = toNumber(draft.heightFeet);
  if (feet === null) return null;
  return round(feetInchesToCm(feet, toNumber(draft.heightInches) ?? 0), 1);
}

export function draftWeightKg(draft: Draft): number | null {
  const weight = toNumber(draft.weight);
  if (weight === null) return null;
  return draft.unitSystem === "METRIC" ? weight : round(lbToKg(weight), 1);
}

/** Re-expresses the typed measurements in the other unit system. */
export function switchUnits(draft: Draft, unitSystem: UnitSystem): Draft {
  if (unitSystem === draft.unitSystem) return draft;
  const heightCm = draftHeightCm(draft);
  const weightKg = draftWeightKg(draft);
  const imperial = unitSystem === "IMPERIAL";
  const { feet, inches } =
    heightCm === null ? { feet: null, inches: null } : cmToFeetInches(heightCm);

  return {
    ...draft,
    unitSystem,
    heightCm: heightCm === null ? "" : String(round(heightCm)),
    heightFeet: feet === null ? "" : String(feet),
    heightInches: inches === null ? "" : String(inches),
    weight:
      weightKg === null
        ? ""
        : String(round(imperial ? kgToLb(weightKg) : weightKg, 1)),
  };
}

/** The draft in the shape the validation schemas expect. */
export function toInput(draft: Draft) {
  // Pregnancy is only asked of women, so it counts as "no" for anyone else.
  const health = {
    ...draft.health,
    pregnancy: draft.gender === "FEMALE" ? draft.health.pregnancy : false,
  };

  return {
    unitSystem: draft.unitSystem,
    age: toNumber(draft.age) ?? undefined,
    gender: draft.gender ?? undefined,
    heightCm: draftHeightCm(draft) ?? undefined,
    weightKg: draftWeightKg(draft) ?? undefined,
    goal: draft.goal ?? undefined,
    level: draft.level ?? undefined,
    daysPerWeek: draft.daysPerWeek ?? undefined,
    sessionMinutes: draft.sessionMinutes ?? undefined,
    equipment: draft.equipment ?? undefined,
    health,
    notes: draft.notes,
    disclaimerAccepted: draft.disclaimerAccepted,
  };
}
