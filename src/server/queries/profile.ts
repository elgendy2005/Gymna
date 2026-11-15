import "server-only";
import { cache } from "react";
import {
  emptyHealthAnswers,
  HEALTH_QUESTIONS,
  type HealthAnswers,
} from "@/lib/health";
import {
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
import { db } from "@/server/db";

export type StrengthBaseline = { lift: BaselineLift; weightKg: number; reps: number };

export type UserProfile = {
  unitSystem: UnitSystem;
  timezone: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  focusAreas: FocusArea[];
  level: Level;
  /** Null for accounts created before the question existed. */
  experience: TrainingExperience | null;
  baselines: StrengthBaseline[];
  daysPerWeek: number;
  /** Weekdays to train on, 0 = Saturday. Always `daysPerWeek` entries. */
  trainingDays: number[];
  sessionMinutes: number;
  equipment: Equipment;
  dumbbellStepKg: number;
  machineStepKg: number;
  health: HealthAnswers;
  notes: string;
  needsClearance: boolean;
  contraindications: string[];
  /** ISO time of the last save. Changes whenever the answers change. */
  savedAt: string;
};

/**
 * The onboarding answers of one user, or null before onboarding.
 * Callers pass the id of the signed-in user only; this data is never read
 * on behalf of anyone else.
 */
export const getUserProfile = cache(
  async (userId: string): Promise<UserProfile | null> => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        unitSystem: true,
        timezone: true,
        profile: true,
        healthScreening: true,
        baselines: { select: { lift: true, weightKg: true, reps: true } },
      },
    });
    if (!user?.profile) return null;

    const { profile, healthScreening: screening } = user;
    const health = emptyHealthAnswers();
    if (screening) {
      for (const question of HEALTH_QUESTIONS) health[question] = screening[question];
    }

    return {
      unitSystem: user.unitSystem,
      timezone: user.timezone,
      age: new Date().getFullYear() - profile.birthYear,
      gender: profile.gender,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      goal: profile.goal,
      focusAreas: profile.focusAreas as FocusArea[],
      level: profile.level,
      experience: profile.experience,
      baselines: user.baselines as StrengthBaseline[],
      daysPerWeek: profile.daysPerWeek,
      trainingDays: resolveTrainingDays(profile.trainingDays, profile.daysPerWeek),
      sessionMinutes: profile.sessionMinutes,
      equipment: profile.equipment,
      dumbbellStepKg: profile.dumbbellStepKg,
      machineStepKg: profile.machineStepKg,
      health,
      notes: screening?.notes ?? "",
      needsClearance: screening?.needsClearance ?? false,
      contraindications: screening?.contraindications ?? [],
      savedAt: (screening?.updatedAt ?? profile.updatedAt).toISOString(),
    };
  },
);
