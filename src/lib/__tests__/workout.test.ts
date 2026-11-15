import { describe, expect, it } from "vitest";
import { formatClock, weightToKg, weightValue } from "@/lib/format";
import {
  exerciseProgress,
  goalReps,
  isExerciseComplete,
  nextOpenExercise,
  sessionProgress,
  volumeKg,
  type ExerciseStatus,
  type WorkoutSet,
} from "@/lib/workout";

let nextId = 0;
const set = (kind: WorkoutSet["kind"], done: boolean, weightKg: number | null = 50, reps = 10): WorkoutSet => ({
  id: `s${nextId++}`,
  order: nextId,
  kind,
  targetReps: 10,
  weightKg,
  reps: done ? reps : null,
  done,
  isPr: false,
});
const exercise = (id: string, sets: WorkoutSet[], status: ExerciseStatus = "PENDING") => ({
  id,
  status,
  sets,
});

describe("workout progress", () => {
  const a = exercise("a", [set("WARMUP", true), set("WORKING", true), set("WORKING", true)]);
  const b = exercise("b", [set("WORKING", true), set("WORKING", false)]);
  const c = exercise("c", [set("WORKING", false), set("WORKING", false)], "SKIPPED");
  const d = exercise("d", [set("WORKING", false)]);

  it("counts working sets only, and leaves skipped exercises out", () => {
    expect(exerciseProgress(a)).toEqual({ done: 2, total: 2 });
    expect(sessionProgress([a, b, c, d])).toEqual({ done: 3, total: 5 });
  });

  it("knows when an exercise is complete", () => {
    expect(isExerciseComplete(a)).toBe(true);
    expect(isExerciseComplete(b)).toBe(false);
    expect(isExerciseComplete(exercise("e", [set("WARMUP", true)]))).toBe(false);
  });

  it("finds the next exercise with work left, wrapping around", () => {
    expect(nextOpenExercise([a, b, c, d])?.id).toBe("b");
    expect(nextOpenExercise([a, b, c, d], "b")?.id).toBe("d");
    expect(nextOpenExercise([a, b, c, d], "d")?.id).toBe("b");
    expect(nextOpenExercise([a, c])).toBeNull();
  });

  it("adds up volume from completed working sets", () => {
    expect(volumeKg([...a.sets, ...b.sets])).toBe(1500);
    expect(volumeKg([set("WORKING", true, null, 15)])).toBe(0);
  });
});

describe("goal reps for a set row", () => {
  it("aims where the coach said", () => {
    expect(goalReps({ reason: { code: "add_reps", reps: 9 }, repMin: 8, repMax: 10 })).toBe(9);
    expect(goalReps({ reason: { code: "step_up" }, repMin: 8, repMax: 10 })).toBe(8);
    expect(goalReps({ reason: { code: "hold_confirm" }, repMin: 8, repMax: 10 })).toBe(10);
  });
});

describe("display formatting", () => {
  it("shows weights in the user's unit and stores kg", () => {
    expect(weightValue(42.5, "METRIC")).toBe(42.5);
    expect(weightValue(weightToKg(135, "IMPERIAL"), "IMPERIAL")).toBe(135);
    expect(weightToKg(100, "METRIC")).toBe(100);
  });

  it("formats clocks", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("0:00");
  });
});
