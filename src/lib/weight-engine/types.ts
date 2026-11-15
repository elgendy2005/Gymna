import type { ExerciseEquipment, MovementPattern } from "@/lib/exercise-options";
import type {
  BaselineLift,
  Gender,
  Level,
  TrainingExperience,
  UnitSystem,
} from "@/lib/profile-options";

/** How an exercise is loaded, which decides rounding and the lightest option. */
export type LoadType = "barbell" | "ez_bar" | "dumbbell" | "machine" | "cable" | "bodyweight";

export const EFFORTS = ["EASY", "RIGHT", "HARD"] as const;
/** The lifter's answer to "how did that feel?". */
export type Effort = (typeof EFFORTS)[number];

/** The exercise fields the engine reads. */
export type WeightExercise = {
  slug: string;
  equipment: ExerciseEquipment;
  isCompound: boolean;
  movementPattern: MovementPattern | null;
};

export type Lifter = {
  bodyWeightKg: number;
  gender: Gender;
  age: number;
  level: Level;
  /** Null for accounts created before the question existed. */
  experience: TrainingExperience | null;
  /** Any "yes" in the health screening: smaller steps, further from failure. */
  needsClearance: boolean;
};

/** What the lifter's gym can load. Weights are kg whatever the display unit. */
export type LoadSettings = {
  unitSystem: UnitSystem;
  dumbbellStepKg: number;
  machineStepKg: number;
};

export type Target = { sets: number; repMin: number; repMax: number };

/** One completed working set. Weight is null for bodyweight exercises. */
export type LoggedSet = { weightKg: number | null; reps: number };

/** One past session of an exercise: what was planned and what was done. */
export type PastSession = {
  /** ISO date or timestamp. */
  date: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  /** Completed working sets in the order they were done. */
  sets: LoggedSet[];
  feedback: Effort | null;
};

/** What the engine knows about the lifter's strength on the reference lifts. */
export type KnownLifts = {
  /** Sets reported at onboarding. */
  baselines?: Partial<Record<BaselineLift, { weightKg: number; reps: number }>>;
  /** Estimated one-rep maxes from logged sessions of the reference lifts. */
  logged?: Partial<Record<BaselineLift, number>>;
};

export const REASON_CODES = [
  "start_baseline",
  "start_related",
  "start_bodyweight",
  "step_up",
  "step_up_easy",
  "hold_confirm",
  "add_reps",
  "hold_missed",
  "hold_hard",
  "reduce",
  "deload",
  "new_range",
  "bodyweight_start",
  "bodyweight_reps",
  "bodyweight_harder",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

/** Why the engine chose a weight. The UI turns the code into a sentence. */
export type Reason = {
  code: ReasonCode;
  /** Present on codes that compare with last time. */
  fromKg?: number;
  toKg?: number;
  /** Reps (or seconds) to aim for on codes that chase reps. */
  reps?: number;
};

export type WarmupSet = { weightKg: number; reps: number };

export type Recommendation = {
  /** Per dumbbell for dumbbell exercises. Null for bodyweight exercises. */
  weightKg: number | null;
  repMin: number;
  repMax: number;
  reason: Reason;
  /** First time on this exercise: the weight is an estimate to be corrected. */
  calibration: boolean;
  /** True when the engine backs off after a run of stalled sessions. */
  deload: boolean;
  warmups: WarmupSet[];
};
