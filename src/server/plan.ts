import "server-only";
import { resolveTrainingDays, type FocusArea } from "@/lib/profile-options";
import { ENGINE_VERSION, generatePlan, type EngineProfile } from "@/lib/program-engine";
import { db } from "@/server/db";
import { getEngineExercises } from "@/server/queries/exercises";

export type SyncPlanResult = "created" | "unchanged" | "no_profile";

/** Key order differs once JSON has been through Postgres, so compare sorted. */
function fingerprint(inputs: object): string {
  return JSON.stringify(inputs, Object.keys(inputs).sort());
}

/**
 * Makes the user's active plan match their saved answers. Builds a new plan
 * and archives the old one when the answers or the engine rules changed, or
 * when `reseed` asks for a different mix of exercises from the same answers.
 * Callers pass the id of the signed-in user only.
 */
export async function syncPlan(
  userId: string,
  options: { reseed?: boolean } = {},
): Promise<SyncPlanResult> {
  const [user, current, exercises] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        profile: true,
        healthScreening: { select: { needsClearance: true, contraindications: true } },
      },
    }),
    db.plan.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { engineVersion: true, inputs: true },
    }),
    getEngineExercises(),
  ]);
  if (!user?.profile) return "no_profile";
  const { profile, healthScreening } = user;

  const previous = current?.inputs as Partial<EngineProfile> | undefined;
  const inputs: EngineProfile = {
    goal: profile.goal,
    level: profile.level,
    daysPerWeek: profile.daysPerWeek,
    trainingDays: resolveTrainingDays(profile.trainingDays, profile.daysPerWeek),
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment,
    focusAreas: profile.focusAreas as FocusArea[],
    contraindications: [...(healthScreening?.contraindications ?? [])].sort(),
    needsClearance: healthScreening?.needsClearance ?? false,
    // The seed stays with the user across edits, so changing one answer
    // does not reshuffle the exercises that answer has nothing to do with.
    seed:
      options.reseed || !previous?.seed ? `${userId}:${Date.now().toString(36)}` : previous.seed,
  };

  if (
    current &&
    current.engineVersion === ENGINE_VERSION &&
    fingerprint(current.inputs as object) === fingerprint(inputs)
  ) {
    return "unchanged";
  }

  const plan = generatePlan(inputs, exercises);
  const idBySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise.id]));

  await db.$transaction([
    db.plan.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    }),
    db.plan.create({
      data: {
        userId,
        split: plan.split,
        engineVersion: plan.engineVersion,
        inputs,
        days: {
          create: plan.days.map((day) => ({
            order: day.order,
            weekday: day.weekday,
            type: day.type,
            estimatedMinutes: day.estimatedMinutes,
            exercises: {
              create: day.exercises.map((item, order) => ({
                order,
                exerciseId: idBySlug.get(item.slug)!,
                sets: item.sets,
                repMin: item.repMin,
                repMax: item.repMax,
                restSeconds: item.restSeconds,
                focusExtra: item.focusExtra,
              })),
            },
          })),
        },
      },
    }),
  ]);
  return "created";
}
