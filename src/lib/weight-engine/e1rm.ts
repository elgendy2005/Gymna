import { E1RM_WINDOW_DAYS, MAX_E1RM_REPS, PERCENT_OF_E1RM } from "./config";
import type { PastSession } from "./types";

/** Estimated one-rep max from one set (Epley). One rep is the weight itself. */
export function epley(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, MAX_E1RM_REPS) / 30);
}

/** Share of the one-rep max to load for sets of `reps`. */
export function percentForReps(reps: number): number {
  const points = PERCENT_OF_E1RM;
  if (reps <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index++) {
    const [upperReps, upperShare] = points[index];
    if (reps <= upperReps) {
      const [lowerReps, lowerShare] = points[index - 1];
      const position = (reps - lowerReps) / (upperReps - lowerReps);
      return lowerShare + (upperShare - lowerShare) * position;
    }
  }
  return points[points.length - 1][1];
}

/** Share of the one-rep max for a rep range: aimed at the middle of it. */
export function percentForRange(repMin: number, repMax: number): number {
  return percentForReps((repMin + repMax) / 2);
}

/** Best estimate from one session's sets, or 0 with no loaded sets. */
export function sessionE1rm(session: Pick<PastSession, "sets">): number {
  return Math.max(0, ...session.sets.map((set) => epley(set.weightKg ?? 0, set.reps)));
}

/**
 * The lifter's current one-rep max: the best set of the recent window. With
 * nothing recent it falls back to the latest session, so a lifter back from
 * a break is judged on what they last did, not on an old record.
 */
export function bestRecentE1rm(
  history: readonly PastSession[],
  now: Date = new Date(),
  windowDays: number = E1RM_WINDOW_DAYS,
): number | null {
  const loaded = history.filter((session) => sessionE1rm(session) > 0);
  if (loaded.length === 0) return null;

  const cutoff = now.getTime() - windowDays * 86_400_000;
  const recent = loaded.filter((session) => new Date(session.date).getTime() >= cutoff);
  if (recent.length > 0) return Math.max(...recent.map(sessionE1rm));

  const latest = loaded.reduce((a, b) => (new Date(b.date) > new Date(a.date) ? b : a));
  return sessionE1rm(latest);
}
