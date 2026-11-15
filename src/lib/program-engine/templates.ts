import type { MovementPattern } from "@/lib/exercise-options";
import type { EngineProfile, DayType, Role, Split } from "./types";

/**
 * One place in a training day. `patterns` is tried in order: the first
 * pattern that has an exercise this user can do fills the slot, so a home
 * user with no pull-up bar gets a row where the template wants a pulldown.
 * `keep` is how early the slot is dropped when the session is short:
 * 1 stays longest, 3 goes first.
 */
export type Slot = {
  patterns: readonly MovementPattern[];
  role: Role;
  keep: 1 | 2 | 3;
};

const slot = (role: Role, keep: Slot["keep"], ...patterns: MovementPattern[]): Slot => ({
  patterns,
  role,
  keep,
});

// Slots are listed in the order they are trained: heavy compounds first,
// single-joint work after, core last.
const TEMPLATES: Record<DayType, readonly (readonly Slot[])[]> = {
  FULL_BODY: [
    [
      slot("main", 1, "squat", "lunge", "glutes"),
      slot("compound", 1, "horizontal_push", "vertical_push"),
      slot("compound", 1, "horizontal_pull", "vertical_pull", "rear_delt"),
      slot("compound", 2, "vertical_push", "lateral_raise", "horizontal_push"),
      slot("accessory", 2, "leg_curl", "hinge", "glutes"),
      slot("accessory", 3, "biceps", "rear_delt"),
      slot("core", 3, "core"),
    ],
    [
      slot("main", 1, "hinge", "glutes", "lunge", "squat"),
      slot("compound", 1, "vertical_pull", "horizontal_pull", "rear_delt"),
      slot("compound", 1, "vertical_push", "horizontal_push"),
      slot("compound", 2, "lunge", "squat", "glutes"),
      slot("accessory", 2, "chest_fly", "horizontal_push"),
      slot("accessory", 3, "triceps"),
      slot("core", 3, "core"),
    ],
  ],
  UPPER: [
    [
      slot("main", 1, "horizontal_push", "vertical_push"),
      slot("compound", 1, "horizontal_pull", "vertical_pull"),
      slot("compound", 1, "vertical_push", "lateral_raise"),
      slot("compound", 2, "vertical_pull", "horizontal_pull"),
      slot("accessory", 2, "lateral_raise", "rear_delt"),
      slot("accessory", 3, "biceps"),
      slot("accessory", 3, "triceps"),
    ],
    [
      slot("main", 1, "vertical_pull", "horizontal_pull"),
      slot("compound", 1, "vertical_push", "horizontal_push"),
      slot("compound", 1, "horizontal_pull", "vertical_pull"),
      slot("compound", 2, "horizontal_push", "chest_fly"),
      slot("accessory", 2, "rear_delt", "lateral_raise"),
      slot("accessory", 3, "triceps"),
      slot("accessory", 3, "biceps"),
    ],
  ],
  LOWER: [
    [
      slot("main", 1, "squat", "lunge", "glutes"),
      slot("compound", 1, "hinge", "glutes"),
      slot("compound", 2, "lunge", "squat", "glutes"),
      slot("accessory", 2, "leg_curl", "glutes"),
      slot("accessory", 3, "calves"),
      slot("core", 3, "core"),
    ],
    [
      slot("main", 1, "hinge", "glutes", "squat"),
      slot("compound", 1, "squat", "lunge"),
      slot("compound", 2, "glutes", "lunge"),
      slot("accessory", 2, "leg_extension", "lunge", "squat"),
      slot("accessory", 3, "calves"),
      slot("core", 3, "core"),
    ],
  ],
  PUSH: [
    [
      slot("main", 1, "horizontal_push", "vertical_push"),
      slot("compound", 1, "vertical_push", "horizontal_push"),
      slot("compound", 2, "horizontal_push", "chest_fly"),
      slot("accessory", 1, "lateral_raise", "vertical_push"),
      slot("accessory", 2, "triceps"),
      slot("accessory", 3, "chest_fly", "horizontal_push"),
      slot("accessory", 3, "triceps"),
    ],
  ],
  PULL: [
    [
      slot("main", 1, "vertical_pull", "horizontal_pull"),
      slot("compound", 1, "horizontal_pull", "vertical_pull"),
      slot("compound", 2, "vertical_pull", "horizontal_pull"),
      slot("accessory", 1, "rear_delt", "horizontal_pull"),
      slot("accessory", 2, "biceps"),
      slot("accessory", 3, "shrug", "rear_delt"),
      slot("accessory", 3, "biceps"),
    ],
  ],
  LEGS: [
    [
      slot("main", 1, "squat", "lunge", "glutes"),
      slot("compound", 1, "hinge", "glutes"),
      slot("compound", 2, "lunge", "squat", "glutes"),
      slot("accessory", 2, "leg_extension", "squat"),
      slot("accessory", 2, "leg_curl", "glutes"),
      slot("accessory", 3, "glutes", "hinge"),
      slot("accessory", 3, "calves"),
      slot("core", 3, "core"),
    ],
  ],
};

/** The slots of the nth day of a type in the week. Types with two variants alternate. */
export function templateFor(type: DayType, occurrence: number): readonly Slot[] {
  const variants = TEMPLATES[type];
  return variants[occurrence % variants.length];
}

/** Patterns that belong on each day type, used to top up a thin day. */
export const DAY_PATTERNS: Record<DayType, readonly MovementPattern[]> = {
  FULL_BODY: [
    "squat",
    "horizontal_push",
    "horizontal_pull",
    "hinge",
    "vertical_push",
    "vertical_pull",
    "lunge",
    "glutes",
    "core",
    "biceps",
    "triceps",
    "lateral_raise",
    "rear_delt",
    "calves",
  ],
  UPPER: [
    "horizontal_push",
    "horizontal_pull",
    "vertical_push",
    "vertical_pull",
    "lateral_raise",
    "rear_delt",
    "biceps",
    "triceps",
    "chest_fly",
    "shrug",
  ],
  LOWER: ["squat", "hinge", "lunge", "glutes", "leg_curl", "leg_extension", "calves", "core"],
  PUSH: ["horizontal_push", "vertical_push", "chest_fly", "lateral_raise", "triceps", "core"],
  PULL: ["vertical_pull", "horizontal_pull", "rear_delt", "biceps", "shrug", "core"],
  LEGS: ["squat", "hinge", "lunge", "glutes", "leg_curl", "leg_extension", "calves", "core"],
};

const WEEK: Record<Split, readonly DayType[]> = {
  full_body: ["FULL_BODY"],
  upper_lower: ["UPPER", "LOWER"],
  push_pull_legs: ["PUSH", "PULL", "LEGS"],
  ppl_upper_lower: ["PUSH", "PULL", "LEGS", "UPPER", "LOWER"],
  push_pull_legs_x2: ["PUSH", "PULL", "LEGS"],
};

/**
 * The split for a week. Two days, or three for a beginner, train the whole
 * body each time. Home bodyweight training has no pulling movements to fill
 * a pull day with, so it always trains the whole body.
 */
export function chooseSplit(profile: Pick<EngineProfile, "daysPerWeek" | "level" | "equipment">): Split {
  if (profile.equipment === "BODYWEIGHT" || profile.daysPerWeek <= 2) return "full_body";
  if (profile.daysPerWeek === 3) {
    return profile.level === "BEGINNER" ? "full_body" : "push_pull_legs";
  }
  if (profile.daysPerWeek === 4) return "upper_lower";
  if (profile.daysPerWeek === 5) return "ppl_upper_lower";
  return "push_pull_legs_x2";
}

/** Day types for the week, in training order. */
export function weekDayTypes(split: Split, daysPerWeek: number): DayType[] {
  const cycle = WEEK[split];
  return Array.from({ length: daysPerWeek }, (_, index) => cycle[index % cycle.length]);
}
