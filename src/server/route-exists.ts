import "server-only";
import { db } from "@/server/db";

// Fast existence checks for the proxy. With Cache Components a page sends
// its shell (and a 200) before any request-time `notFound()` can run, so
// a real 404 has to be decided before the page renders. The pages still call
// `notFound()` themselves; these only set the status.

export async function exerciseExists(slug: string): Promise<boolean> {
  const row = await db.exercise.findUnique({ where: { slug }, select: { id: true } });
  return row !== null;
}

export async function completedWorkoutExists(userId: string, id: string): Promise<boolean> {
  const row = await db.workoutSession.findFirst({
    where: { id, userId, status: "COMPLETED" },
    select: { id: true },
  });
  return row !== null;
}
