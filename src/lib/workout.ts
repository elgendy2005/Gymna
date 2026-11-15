// Types and small rules shared by the workout screen and the server code
// behind it. No database or framework imports.

import type { ExerciseEquipment, MediaKind, Muscle } from "@/lib/exercise-options";
import type { UnitSystem } from "@/lib/profile-options";
import type { DayType } from "@/lib/program-engine";
import type { Effort, LoadType, Reason, Recommendation } from "@/lib/weight-engine";

export type SetKind = "WARMUP" | "WORKING";
export type ExerciseStatus = "PENDING" | "DONE" | "SKIPPED";

export type WorkoutSet = {
  id: string;
  order: number;
  kind: SetKind;
  /** Reps (or seconds) the row starts with. */
  targetReps: number;
  /** Per dumbbell for dumbbell exercises. Null for bodyweight exercises. */
  weightKg: number | null;
  reps: number | null;
  done: boolean;
  isPr: boolean;
};

export type WorkoutAlternative = {
  exerciseId: string;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  equipment: ExerciseEquipment;
  thumb: string | null;
};

export type LastTime = { weightKg: number | null; reps: number[] };

export type WorkoutExercise = {
  /** The session exercise id. */
  id: string;
  exerciseId: string;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  equipment: ExerciseEquipment;
  loadType: LoadType;
  /** True when reps are seconds. */
  timed: boolean;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  media: { kind: MediaKind; urls: string[] }[];
  thumb: string | null;
  /** Coaching text in the page's language. */
  cues: string[];
  mistakes: string[];
  breathing: string | null;
  status: ExerciseStatus;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  suggestedWeightKg: number | null;
  reason: Reason;
  /** Which wording of the reason to show. */
  variant: number;
  calibration: boolean;
  deload: boolean;
  lastTime: LastTime | null;
  /** The answer to "how did the first set feel?" in a calibration session. */
  calibrationEffort: Effort | null;
  feedback: Effort | null;
  notes: string;
  swapped: boolean;
  sets: WorkoutSet[];
  /** Exercises this one can be swapped for, best first. */
  alternatives: WorkoutAlternative[];
};

export type WorkoutView = {
  id: string;
  dayType: DayType;
  /** ISO timestamp. */
  startedAt: string;
  unitSystem: UnitSystem;
  needsClearance: boolean;
  exercises: WorkoutExercise[];
};

/** What is stored next to the reason code on a session exercise. */
export type ReasonData = {
  fromKg?: number;
  toKg?: number;
  reps?: number;
  variant: number;
  deload: boolean;
  lastTime: LastTime | null;
  calibrationEffort?: Effort | null;
};

/**
 * The reps a set row starts with. Weight changes start from the bottom of
 * the range; holding a weight aims at what the coach asked for.
 */
export function goalReps(
  recommendation: Pick<Recommendation, "reason" | "repMin" | "repMax">,
): number {
  const { reason, repMin, repMax } = recommendation;
  if (reason.reps !== undefined) return reason.reps;
  if (reason.code === "hold_confirm" || reason.code === "bodyweight_harder") return repMax;
  return repMin;
}

const working = (exercise: Pick<WorkoutExercise, "sets">) =>
  exercise.sets.filter((set) => set.kind === "WORKING");

/** Working sets done and planned across the exercises that were not skipped. */
export function sessionProgress(exercises: readonly Pick<WorkoutExercise, "sets" | "status">[]): {
  done: number;
  total: number;
} {
  let done = 0;
  let total = 0;
  for (const exercise of exercises) {
    if (exercise.status === "SKIPPED") continue;
    const sets = working(exercise);
    total += sets.length;
    done += sets.filter((set) => set.done).length;
  }
  return { done, total };
}

/** Working sets done and planned for one exercise. */
export function exerciseProgress(exercise: Pick<WorkoutExercise, "sets">): {
  done: number;
  total: number;
} {
  const sets = working(exercise);
  return { done: sets.filter((set) => set.done).length, total: sets.length };
}

/** True once every working set of the exercise is checked off. */
export function isExerciseComplete(exercise: Pick<WorkoutExercise, "sets">): boolean {
  const { done, total } = exerciseProgress(exercise);
  return total > 0 && done === total;
}

/** The first exercise that still has work to do, or null when all are done or skipped. */
export function nextOpenExercise<T extends Pick<WorkoutExercise, "sets" | "status" | "id">>(
  exercises: readonly T[],
  after?: string,
): T | null {
  const start = after ? exercises.findIndex((exercise) => exercise.id === after) + 1 : 0;
  const open = (exercise: T) => exercise.status !== "SKIPPED" && !isExerciseComplete(exercise);
  return exercises.slice(start).find(open) ?? exercises.slice(0, start).find(open) ?? null;
}

/** Wordings per cooldown group in the message files. */
export const COOLDOWN_VARIANTS = 3;
export const COOLDOWN_GROUPS = ["upper", "lower", "full", "cautious"] as const;
export type CooldownGroup = (typeof COOLDOWN_GROUPS)[number];

/** Which set of cooldown messages fits a workout. A health flag comes first. */
export function cooldownGroup(dayType: DayType, needsClearance: boolean): CooldownGroup {
  if (needsClearance) return "cautious";
  if (dayType === "LOWER" || dayType === "LEGS") return "lower";
  if (dayType === "FULL_BODY") return "full";
  return "upper";
}

/** A stored cooldown key such as "lower.2", or null when it is not one we have. */
export function parseCooldownKey(key: string | null): { group: CooldownGroup; variant: number } | null {
  const [group, index] = (key ?? "").split(".");
  const variant = Number(index);
  if (!COOLDOWN_GROUPS.includes(group as CooldownGroup)) return null;
  if (!Number.isInteger(variant) || variant < 0 || variant >= COOLDOWN_VARIANTS) return null;
  return { group: group as CooldownGroup, variant };
}

/** Weight x reps over completed working sets, in kg. Bodyweight sets add nothing. */
export function volumeKg(
  sets: readonly { kind: SetKind; done: boolean; weightKg: number | null; reps: number | null }[],
): number {
  const total = sets
    .filter((set) => set.kind === "WORKING" && set.done)
    .reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
  return Math.round(total * 10) / 10;
}
