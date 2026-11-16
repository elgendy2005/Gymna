import { createHash, randomBytes } from "node:crypto";

/**
 * Password reset tokens, kept in the Auth.js `VerificationToken` table.
 *
 * - The link carries a random 32-byte token; the table stores only its
 *   SHA-256 hash, so a leaked database row cannot be turned into a link.
 * - `identifier` says what the row is for and for which email:
 *   `password-reset:<email>` while the token can still be used,
 *   `password-reset-used:<email>` once it has been used (kept until it
 *   expires, so a second click says "already used" instead of "invalid").
 * - A new request deletes the email's unused tokens, so only the newest
 *   link works.
 *
 * Everything here works against a small store interface so it can be
 * tested without a database; `src/server/password-reset.ts` provides the
 * Prisma-backed store.
 */

export const RESET_TOKEN_BYTES = 32;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const ACTIVE_PREFIX = "password-reset:";
const USED_PREFIX = "password-reset-used:";

export const activeIdentifier = (email: string) => `${ACTIVE_PREFIX}${email}`;
export const usedIdentifier = (email: string) => `${USED_PREFIX}${email}`;

export type TokenRow = { identifier: string; token: string; expires: Date };

export interface ResetTokenStore {
  /** Deletes every row with this identifier. */
  deleteByIdentifier(identifier: string): Promise<void>;
  create(row: TokenRow): Promise<void>;
  /** The row with this token hash under any reset identifier, or null. */
  findByHash(hash: string): Promise<TokenRow | null>;
  /**
   * Atomically moves the row `(from, hash)` to identifier `to`, but only if
   * it still exists and has not expired at `now`. Returns whether it moved,
   * so two simultaneous submissions cannot both use one token.
   */
  claim(hash: string, from: string, to: string, now: Date): Promise<boolean>;
}

/** A URL-safe random token (43 characters for 32 bytes). */
export function generateResetToken(): string {
  return randomBytes(RESET_TOKEN_BYTES).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// base64url of 32 bytes, nothing else. Anything else is rejected before a
// database lookup.
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_SHAPE.test(token);
}

/**
 * Creates a token for `email`, replacing any unused one. Returns the raw
 * token for the email link; only its hash is stored.
 */
export async function createResetToken(
  store: ResetTokenStore,
  email: string,
  now: Date = new Date(),
): Promise<string> {
  const token = generateResetToken();
  await store.deleteByIdentifier(activeIdentifier(email));
  await store.create({
    identifier: activeIdentifier(email),
    token: hashResetToken(token),
    expires: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
  });
  return token;
}

export type TokenStatus =
  | { status: "valid"; email: string }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "used" };

/** What a token is, without using it. For showing the right screen. */
export async function checkResetToken(
  store: ResetTokenStore,
  token: unknown,
  now: Date = new Date(),
): Promise<TokenStatus> {
  if (!isWellFormedToken(token)) return { status: "invalid" };
  const row = await store.findByHash(hashResetToken(token));
  if (!row) return { status: "invalid" };
  if (row.identifier.startsWith(USED_PREFIX)) return { status: "used" };
  if (!row.identifier.startsWith(ACTIVE_PREFIX)) return { status: "invalid" };
  if (row.expires.getTime() <= now.getTime()) return { status: "expired" };
  return { status: "valid", email: row.identifier.slice(ACTIVE_PREFIX.length) };
}

/**
 * Uses a token: marks it used and returns the email it was issued for. Any
 * other outcome returns the reason it cannot be used.
 */
export async function consumeResetToken(
  store: ResetTokenStore,
  token: unknown,
  now: Date = new Date(),
): Promise<TokenStatus> {
  const checked = await checkResetToken(store, token, now);
  if (checked.status !== "valid") return checked;

  const claimed = await store.claim(
    hashResetToken(token as string),
    activeIdentifier(checked.email),
    usedIdentifier(checked.email),
    now,
  );
  if (!claimed) {
    // Lost a race with another submission, or it expired in between.
    return checkResetToken(store, token, now);
  }
  return checked;
}
