import "server-only";
import { cache } from "react";
import {
  emptyHealthAnswers,
  HEALTH_QUESTIONS,
  type HealthAnswers,
} from "@/lib/health";
import type {
  Equipment,
  Gender,
  Goal,
  Level,
  UnitSystem,
} from "@/lib/profile-options";
import { db } from "@/server/db";

export type UserProfile = {
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
      select: { unitSystem: true, profile: true, healthScreening: true },
    });
    if (!user?.profile) return null;

    const { profile, healthScreening: screening } = user;
    const health = emptyHealthAnswers();
    if (screening) {
      for (const question of HEALTH_QUESTIONS) health[question] = screening[question];
    }

    return {
      unitSystem: user.unitSystem,
      age: new Date().getFullYear() - profile.birthYear,
      gender: profile.gender,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      goal: profile.goal,
      level: profile.level,
      daysPerWeek: profile.daysPerWeek,
      sessionMinutes: profile.sessionMinutes,
      equipment: profile.equipment,
      health,
      notes: screening?.notes ?? "",
      needsClearance: screening?.needsClearance ?? false,
      contraindications: screening?.contraindications ?? [],
      savedAt: (screening?.updatedAt ?? profile.updatedAt).toISOString(),
    };
  },
);
