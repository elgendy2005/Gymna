import { createHash } from "node:crypto";

/**
 * A sliding-window rate limit that keeps one row per accepted attempt.
 *
 * On Vercel each request may run in a different instance, so counters in
 * memory would not add up; the rows live in the database instead (the
 * `VerificationToken` table, see `src/server/password-reset.ts`). Keys are
 * hashed, so neither email addresses nor IP addresses are stored by it.
 *
 * Counting and recording are two queries, not one atomic step, so a burst
 * of simultaneous requests can overshoot a limit by a few. That is fine for
 * slowing down abuse of an email form; it is not a hard quota.
 */

export interface RateLimitStore {
  /** Attempts recorded under `key` that are still inside their window. */
  count(key: string, now: Date): Promise<number>;
  /** Records one attempt that stops counting at `expires`. */
  add(key: string, expires: Date): Promise<void>;
}

export type RateLimitRule = { name: string; value: string; limit: number; windowMs: number };

export function rateLimitKey(name: string, value: string): string {
  const digest = createHash("sha256").update(value, "utf8").digest("hex");
  return `rate-limit:${name}:${digest}`;
}

/**
 * Checks every rule and records the attempt under each of them only when all
 * allow it, so refused attempts do not extend a lockout. Returns whether the
 * attempt is allowed.
 */
export async function takeRateLimit(
  store: RateLimitStore,
  rules: RateLimitRule[],
  now: Date = new Date(),
): Promise<boolean> {
  const keyed = rules.map((rule) => ({ ...rule, key: rateLimitKey(rule.name, rule.value) }));
  for (const rule of keyed) {
    if ((await store.count(rule.key, now)) >= rule.limit) return false;
  }
  for (const rule of keyed) {
    await store.add(rule.key, new Date(now.getTime() + rule.windowMs));
  }
  return true;
}
