import {
  HEALTH_QUESTIONS,
  type HealthQuestion,
} from "@/lib/health";
import {
  BASELINE_LIFTS,
  defaultTrainingDays,
  resolveTrainingDays,
  type BaselineLift,
  type Equipment,
  type FocusArea,
  type Gender,
  type Goal,
  type Level,
  type TrainingExperience,
  type UnitSystem,
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
  focusAreas: FocusArea[];
  level: Level | null;
  experience: TrainingExperience | null;
  /** Typed weight (in the current unit system) and reps per lift. */
  lifts: Record<BaselineLift, LiftDraft>;
  daysPerWeek: number | null;
  trainingDays: number[];
  sessionMinutes: number | null;
  equipment: Equipment | null;
  health: Record<HealthQuestion, boolean | null>;
  notes: string;
  disclaimerAccepted: boolean;
};

export type LiftDraft = { weight: string; reps: string };

const emptyLifts = () =>
  Object.fromEntries(
    BASELINE_LIFTS.map((lift) => [lift, { weight: "", reps: "" }]),
  ) as Draft["lifts"];

/** Saved answers used to prefill the wizard when editing. */
export type DraftSource = {
  unitSystem: UnitSystem;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  focusAreas: FocusArea[];
  level: Level;
  experience: TrainingExperience | null;
  lifts: { lift: BaselineLift; weightKg: number; reps: number }[];
  daysPerWeek: number;
  trainingDays: number[];
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
    focusAreas: [],
    level: null,
    experience: null,
    lifts: emptyLifts(),
    daysPerWeek: 3,
    trainingDays: defaultTrainingDays(3),
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
  const lifts = emptyLifts();
  for (const entry of source.lifts) {
    lifts[entry.lift] = {
      weight: String(round(imperial ? kgToLb(entry.weightKg) : entry.weightKg, 1)),
      reps: String(entry.reps),
    };
  }
  return {
    unitSystem: source.unitSystem,
    age: String(source.age),
    gender: source.gender,
    heightCm: String(round(source.heightCm)),
    heightFeet: String(feet),
    heightInches: String(inches),
    weight: String(round(imperial ? kgToLb(source.weightKg) : source.weightKg, 1)),
    goal: source.goal,
    focusAreas: [...source.focusAreas],
    level: source.level,
    experience: source.experience,
    lifts,
    daysPerWeek: source.daysPerWeek,
    trainingDays: resolveTrainingDays(source.trainingDays, source.daysPerWeek),
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

/**
 * True when the inches box holds something a height cannot have: text that
 * is not a number, a negative, or 12 and above (that is another foot).
 * Empty counts as zero inches.
 */
export function inchesOutOfRange(text: string): boolean {
  if (text.trim() === "") return false;
  const inches = toNumber(text);
  return inches === null || inches < 0 || inches >= 12;
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
    lifts: Object.fromEntries(
      BASELINE_LIFTS.map((lift) => {
        const typed = toNumber(draft.lifts[lift].weight);
        const converted =
          typed === null ? "" : String(round(imperial ? kgToLb(typed) : lbToKg(typed), 1));
        return [lift, { ...draft.lifts[lift], weight: converted }];
      }),
    ) as Draft["lifts"],
  };
}

/** True when the user typed anything for the lift. */
export function liftStarted(entry: LiftDraft): boolean {
  return entry.weight.trim() !== "" || entry.reps.trim() !== "";
}

/** Lifts the user filled in, weights converted to kg. Half-filled rows keep an
 *  undefined field so validation can point at them. */
export function draftLifts(draft: Draft) {
  return BASELINE_LIFTS.filter((lift) => liftStarted(draft.lifts[lift])).map((lift) => {
    const weight = toNumber(draft.lifts[lift].weight);
    return {
      lift,
      weightKg:
        weight === null
          ? undefined
          : draft.unitSystem === "METRIC"
            ? weight
            : round(lbToKg(weight), 1),
      reps: toNumber(draft.lifts[lift].reps) ?? undefined,
    };
  });
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
    focusAreas: draft.focusAreas,
    level: draft.level ?? undefined,
    experience: draft.experience ?? undefined,
    // Someone who never lifted has no weights to report.
    lifts: draft.experience === "NEVER" ? [] : draftLifts(draft),
    daysPerWeek: draft.daysPerWeek ?? undefined,
    trainingDays: [...draft.trainingDays].sort((a, b) => a - b),
    sessionMinutes: draft.sessionMinutes ?? undefined,
    equipment: draft.equipment ?? undefined,
    health,
    notes: draft.notes,
    disclaimerAccepted: draft.disclaimerAccepted,
  };
}
