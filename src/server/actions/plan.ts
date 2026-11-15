"use server";

import { syncPlan } from "@/server/plan";
import { getSessionUser } from "@/server/session";

export type PlanResult = { ok: true } | { ok: false; error: "unauthorized" | "server_error" };

/** Builds a new plan from the same answers with a different mix of exercises. */
export async function regeneratePlanAction(): Promise<PlanResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  try {
    const result = await syncPlan(user.id, { reseed: true });
    return result === "no_profile" ? { ok: false, error: "server_error" } : { ok: true };
  } catch (error) {
    console.error("regeneratePlanAction failed", error);
    return { ok: false, error: "server_error" };
  }
}
