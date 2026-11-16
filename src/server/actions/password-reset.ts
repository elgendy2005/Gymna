"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { after } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset-flow";
import type { ForgotPasswordResult, ResetPasswordResult } from "@/lib/validation/auth";
import { db } from "@/server/db";
import { sendPasswordResetEmail } from "@/server/email";
import {
  prismaRateLimitStore,
  prismaTokenStore,
  purgeExpiredResetRows,
  resetLinkBase,
} from "@/server/password-reset";

/**
 * The client's IP. On Vercel `x-real-ip` and the first `x-forwarded-for`
 * entry are set by the platform, not by the client.
 */
async function clientIp(): Promise<string | null> {
  const list = await headers();
  const ip = list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

export async function forgotPasswordAction(
  input: unknown,
  locale: unknown,
): Promise<ForgotPasswordResult> {
  try {
    return await requestPasswordReset(
      input,
      {
        ip: await clientIp(),
        locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
      },
      {
        rateLimits: prismaRateLimitStore,
        tokens: prismaTokenStore(),
        findUser: (email) => db.user.findUnique({ where: { email }, select: { email: true } }),
        sendEmail: sendPasswordResetEmail,
        defer: (task) =>
          after(async () => {
            await task();
            await purgeExpiredResetRows().catch((error: unknown) =>
              console.error("purgeExpiredResetRows failed", error),
            );
          }),
        linkBase: resetLinkBase(),
      },
    );
  } catch (error) {
    console.error("forgotPasswordAction failed", error);
    return { ok: false, error: "server_error" };
  }
}

export async function resetPasswordAction(
  token: unknown,
  input: unknown,
): Promise<ResetPasswordResult> {
  try {
    // Using the token and setting the password succeed or fail together.
    // The timeout leaves room for bcrypt on a cold serverless instance.
    return await db.$transaction(
      (tx) =>
        resetPassword(token, input, {
          tokens: prismaTokenStore(tx),
          // Same cost as signup.
          hashPassword: (password) => bcrypt.hash(password, 12),
          async setPassword(email, passwordHash) {
            const { count } = await tx.user.updateMany({
              where: { email },
              data: { passwordHash },
            });
            return count === 1;
          },
        }),
      { timeout: 15_000 },
    );
  } catch (error) {
    console.error("resetPasswordAction failed", error);
    return { ok: false, error: "server_error" };
  }
}
