"use server";

import { assessHealth } from "@/lib/health";
import {
  onboardingSchema,
  type OnboardingResult,
} from "@/lib/validation/onboarding";
import { db } from "@/server/db";
import { syncPlan } from "@/server/plan";
import { getSessionUser } from "@/server/session";

/** Saves the onboarding answers. Also used when the user edits them later. */
export async function saveOnboardingAction(
  input: unknown,
): Promise<OnboardingResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const { unitSystem, age, health, notes, timezone, ...rest } = parsed.data;
  const profile = {
    gender: rest.gender,
    heightCm: rest.heightCm,
    weightKg: rest.weightKg,
    goal: rest.goal,
    focusAreas: rest.focusAreas,
    level: rest.level,
    experience: rest.experience,
    daysPerWeek: rest.daysPerWeek,
    trainingDays: rest.trainingDays,
    sessionMinutes: rest.sessionMinutes,
    equipment: rest.equipment,
  };
  // Someone who never lifted has no weights to report.
  const lifts = rest.experience === "NEVER" ? [] : rest.lifts;

  // Pregnancy is only asked of women; ignore a stray value from anyone else.
  const answers = {
    ...health,
    pregnancy: profile.gender === "FEMALE" && health.pregnancy,
  };
  // Derived on the server so the client cannot understate its own risk.
  const assessment = assessHealth(answers);

  const profileData = {
    ...profile,
    birthYear: new Date().getFullYear() - age,
  };
  const screeningData = {
    ...answers,
    notes: notes || null,
    needsClearance: assessment.needsClearance,
    contraindications: assessment.contraindications,
  };

  try {
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { unitSystem, ...(timezone ? { timezone } : {}) },
      }),
      db.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profileData },
        update: profileData,
      }),
      db.healthScreening.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...screeningData },
        update: screeningData,
      }),
      // The list is replaced as a whole: a lift cleared in the form is removed.
      db.strengthBaseline.deleteMany({ where: { userId: user.id } }),
      db.strengthBaseline.createMany({
        data: lifts.map((entry) => ({ userId: user.id, ...entry })),
      }),
    ]);
    // The plan follows the answers: a changed answer rebuilds it.
    await syncPlan(user.id);
    return { ok: true };
  } catch (error) {
    console.error("saveOnboardingAction failed", error);
    return { ok: false, error: "server_error" };
  }
}
