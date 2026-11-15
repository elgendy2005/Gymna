// What the AI coach is told about a user before a conversation. Built from
// plain data so it can be tested without a database; the chat itself comes
// in a later phase and only has to call this.

import type { Goal, Level, TrainingExperience, UnitSystem } from "@/lib/profile-options";
import type { DayType, Split } from "@/lib/program-engine";
import type { ReasonCode } from "@/lib/weight-engine";
import { weightValue } from "@/lib/format";

export type CoachContextInput = {
  date: string;
  profile: {
    age: number;
    gender: "MALE" | "FEMALE";
    weightKg: number;
    goal: Goal;
    level: Level;
    experience: TrainingExperience | null;
    unitSystem: UnitSystem;
    needsClearance: boolean;
    /** Movement tags to avoid, e.g. "knee". Never the raw health answers. */
    contraindications: readonly string[];
  };
  plan: { split: Split; days: { weekday: number; type: DayType }[] } | null;
  streak: number;
  /** The session on offer today, with what the weight engine suggests. */
  today: {
    dayType: DayType;
    exercises: {
      name: string;
      sets: number;
      repMin: number;
      repMax: number;
      suggestedKg: number | null;
      reason: ReasonCode;
    }[];
  } | null;
  /** Latest workouts, newest first. */
  recent: {
    date: string;
    dayType: DayType;
    exercises: { name: string; sets: { weightKg: number | null; reps: number }[] }[];
  }[];
  /** Current and best estimated one-rep maxes. */
  lifts: { name: string; e1rmKg: number | null; bestE1rmKg: number | null; sessions: number }[];
};

/** How much history the coach is given. */
export const COACH_LIMITS = { recentWorkouts: 5, lifts: 12 } as const;

const WEEKDAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

/**
 * A compact, plain-text briefing for the coach's system prompt. English and
 * unit-aware whatever the app language: the model answers in the user's
 * language, but reads its facts in one stable form.
 */
export function buildCoachContext(input: CoachContextInput): string {
  const { profile } = input;
  const unit = profile.unitSystem === "IMPERIAL" ? "lb" : "kg";
  const weight = (kg: number | null) =>
    kg === null ? "bodyweight" : `${Math.round(weightValue(kg, profile.unitSystem) * 10) / 10} ${unit}`;
  const setsOf = (sets: { weightKg: number | null; reps: number }[]) =>
    sets.map((set) => (set.weightKg === null ? `${set.reps}` : `${weight(set.weightKg)} x ${set.reps}`)).join(", ");

  const lines: string[] = [
    `Date: ${input.date}`,
    `User: ${profile.age} y, ${profile.gender.toLowerCase()}, ${weight(profile.weightKg)}`,
    `Goal: ${profile.goal}. Level: ${profile.level}. Lifting experience: ${profile.experience ?? "unknown"}.`,
    `Units: ${unit}. Dumbbell weights are per dumbbell.`,
  ];

  if (profile.needsClearance) {
    const avoid = profile.contraindications.length > 0 ? profile.contraindications.join(", ") : "none listed";
    lines.push(
      `Health: flagged in screening, advised to get medical clearance. Avoid movements tagged: ${avoid}. Keep advice conservative.`,
    );
  } else {
    lines.push("Health: no flags in screening.");
  }

  if (input.plan) {
    const days = input.plan.days.map((day) => `${WEEKDAYS[day.weekday]} ${day.type}`).join(", ");
    lines.push(`Plan: ${input.plan.split}: ${days}. Streak: ${input.streak} in a row.`);
  }

  if (input.today) {
    lines.push(`Today's session (${input.today.dayType}):`);
    for (const exercise of input.today.exercises) {
      lines.push(
        `- ${exercise.name}: ${exercise.sets} x ${exercise.repMin}-${exercise.repMax}, suggested ${weight(exercise.suggestedKg)} (${exercise.reason})`,
      );
    }
  } else {
    lines.push("Today: no session to do (rest day or already done).");
  }

  const recent = input.recent.slice(0, COACH_LIMITS.recentWorkouts);
  if (recent.length > 0) {
    lines.push("Recent workouts:");
    for (const workout of recent) {
      lines.push(`- ${workout.date} ${workout.dayType}`);
      for (const exercise of workout.exercises) {
        lines.push(`  - ${exercise.name}: ${setsOf(exercise.sets)}`);
      }
    }
  } else {
    lines.push("Recent workouts: none logged yet.");
  }

  const lifts = input.lifts.filter((lift) => lift.e1rmKg !== null).slice(0, COACH_LIMITS.lifts);
  if (lifts.length > 0) {
    lines.push("Estimated one-rep maxes (current / best):");
    for (const lift of lifts) {
      lines.push(`- ${lift.name}: ${weight(lift.e1rmKg)} / ${weight(lift.bestE1rmKg ?? lift.e1rmKg)} over ${lift.sessions} sessions`);
    }
  }

  return lines.join("\n");
}
