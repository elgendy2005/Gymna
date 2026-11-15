import "server-only";
import { cache } from "react";
import { isTimedExercise, type ExerciseEquipment } from "@/lib/exercise-options";
import { ENGINE_VERSION, type DayType, type Split } from "@/lib/program-engine";
import { db } from "@/server/db";
import { syncPlan } from "@/server/plan";

export type PlanExerciseView = {
  id: string;
  exerciseId: string;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  equipment: ExerciseEquipment;
  /** First demo frame, as a path under the media base URL. */
  thumb: string | null;
  sets: number;
  repMin: number;
  repMax: number;
  /** True when repMin and repMax are seconds, not reps. */
  timed: boolean;
  restSeconds: number;
  focusExtra: boolean;
};

export type PlanDayView = {
  id: string;
  order: number;
  /** 0 = Saturday. */
  weekday: number;
  type: DayType;
  estimatedMinutes: number;
  exercises: PlanExerciseView[];
};

export type PlanView = {
  id: string;
  split: Split;
  engineVersion: number;
  days: PlanDayView[];
};

async function readActivePlan(userId: string): Promise<PlanView | null> {
  const plan = await db.plan.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      split: true,
      engineVersion: true,
      days: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          weekday: true,
          type: true,
          estimatedMinutes: true,
          exercises: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              sets: true,
              repMin: true,
              repMax: true,
              restSeconds: true,
              focusExtra: true,
              exercise: {
                select: {
                  id: true,
                  slug: true,
                  nameEn: true,
                  nameAr: true,
                  equipment: true,
                  media: {
                    where: { kind: "FRAME_SEQUENCE" },
                    orderBy: { priority: "desc" },
                    take: 1,
                    select: { urls: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!plan) return null;

  return {
    id: plan.id,
    split: plan.split as Split,
    engineVersion: plan.engineVersion,
    days: plan.days.map((day) => ({
      ...day,
      exercises: day.exercises.map(({ exercise, ...item }) => ({
        ...item,
        exerciseId: exercise.id,
        slug: exercise.slug,
        nameEn: exercise.nameEn,
        nameAr: exercise.nameAr,
        equipment: exercise.equipment,
        thumb: exercise.media[0]?.urls[0] ?? null,
        timed: isTimedExercise(exercise.slug),
      })),
    })),
  };
}

/**
 * The signed-in user's weekly plan, or null before onboarding. An account
 * that has answers but no plan yet (it onboarded before plans existed), or
 * one built by older engine rules, gets its plan built here.
 */
export const getActivePlan = cache(async (userId: string): Promise<PlanView | null> => {
  const plan = await readActivePlan(userId);
  if (plan && plan.engineVersion === ENGINE_VERSION) return plan;

  const result = await syncPlan(userId);
  return result === "created" ? readActivePlan(userId) : plan;
});
