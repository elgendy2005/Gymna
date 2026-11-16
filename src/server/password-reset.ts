import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { checkResetToken, type ResetTokenStore, type TokenStatus } from "@/lib/password-reset";
import type { RateLimitStore } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";
import { db } from "@/server/db";

/**
 * Database side of password reset. Both the reset tokens and the rate-limit
 * rows live in the Auth.js `VerificationToken` table (identifier, token,
 * expires), which nothing else uses while sign-in is by password or Google,
 * so no migration is needed. Their identifiers start with
 * `password-reset` and `rate-limit:` respectively.
 */

type Client = Pick<Prisma.TransactionClient, "verificationToken">;

export function prismaTokenStore(client: Client = db): ResetTokenStore {
  return {
    async deleteByIdentifier(identifier) {
      await client.verificationToken.deleteMany({ where: { identifier } });
    },
    async create(row) {
      await client.verificationToken.create({ data: row });
    },
    async findByHash(hash) {
      // The primary key is (identifier, token), so this lookup scans the
      // table. It only ever holds short-lived rows, cleaned up below.
      return client.verificationToken.findFirst({
        where: { token: hash, identifier: { startsWith: "password-reset" } },
      });
    },
    async claim(hash, from, to, now) {
      const { count } = await client.verificationToken.updateMany({
        where: { identifier: from, token: hash, expires: { gt: now } },
        data: { identifier: to },
      });
      return count === 1;
    },
  };
}

export const prismaRateLimitStore: RateLimitStore = {
  count(key, now) {
    return db.verificationToken.count({ where: { identifier: key, expires: { gt: now } } });
  },
  async add(key, expires) {
    await db.verificationToken.create({
      data: { identifier: key, token: randomUUID(), expires },
    });
  },
};

/** Deletes expired reset and rate-limit rows so the table stays small. */
export async function purgeExpiredResetRows(now: Date = new Date()): Promise<void> {
  await db.verificationToken.deleteMany({
    where: {
      expires: { lt: now },
      OR: [
        { identifier: { startsWith: "password-reset" } },
        { identifier: { startsWith: "rate-limit:" } },
      ],
    },
  });
}

/**
 * The base of the link in the email. SITE_URL when it is set; on a
 * development machine without it, localhost, so a local test does not
 * point at production.
 */
export function resetLinkBase(): string {
  if (process.env.SITE_URL || process.env.NODE_ENV === "production") return SITE_URL;
  try {
    return new URL(process.env.AUTH_URL || "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function getResetTokenStatus(token: unknown): Promise<TokenStatus> {
  return checkResetToken(prismaTokenStore(), token);
}
