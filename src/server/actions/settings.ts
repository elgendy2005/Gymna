"use server";

import { settingsSchema, type SettingsResult } from "@/lib/validation/settings";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/session";

/** Saves the training setup from the settings page. */
export async function saveSettingsAction(input: unknown): Promise<SettingsResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { unitSystem, trainingDays, ...rest } = parsed.data;

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { daysPerWeek: true },
    });
    if (!profile) return { ok: false, error: "invalid_input" };
    if (trainingDays.length !== profile.daysPerWeek) {
      return { ok: false, error: "trainingDaysCount" };
    }

    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { unitSystem } }),
      db.profile.update({
        where: { userId: user.id },
        data: { ...rest, trainingDays: [...trainingDays].sort((a, b) => a - b) },
      }),
    ]);
    return { ok: true };
  } catch (error) {
    console.error("saveSettingsAction failed", error);
    return { ok: false, error: "server_error" };
  }
}
