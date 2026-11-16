"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { hasLocale } from "next-intl";
import { Prisma } from "@/generated/prisma/client";
import { routing } from "@/i18n/routing";
import { timezoneToSave } from "@/lib/timezone";
import {
  loginSchema,
  signupSchema,
  type AuthActionResult,
} from "@/lib/validation/auth";
import { googleEnabled, signIn, signOut } from "@/server/auth";
import { db } from "@/server/db";

function safeLocale(locale: unknown): string {
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}

/**
 * Saves the browser's zone when it differs from the stored one, so "today"
 * follows someone who travels or moves. A failure here never blocks a
 * sign-in that already worked.
 */
async function syncTimezone(email: string, browserZone: unknown): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, timezone: true },
    });
    const timezone = user && timezoneToSave(user.timezone, browserZone);
    if (user && timezone) await db.user.update({ where: { id: user.id }, data: { timezone } });
  } catch (error) {
    console.error("syncTimezone failed", error);
  }
}

export async function loginAction(
  input: unknown,
  browserZone?: unknown,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    await syncTimezone(parsed.data.email, browserZone);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return { ok: false, error: "invalid_credentials" };
    }
    console.error("loginAction failed", error);
    return { ok: false, error: "server_error" };
  }
}

export async function signupAction(
  input: unknown,
  browserZone?: unknown,
): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { name, email, password } = parsed.data;
  const timezone = timezoneToSave("", browserZone);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.create({
      data: { name, email, passwordHash, ...(timezone ? { timezone } : {}) },
    });
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "email_taken" };
    }
    console.error("signupAction failed", error);
    return { ok: false, error: "server_error" };
  }
}

// These two are used as plain <form action>. The locale arrives in a hidden
// field instead of a bound argument: bound arguments are encrypted with a
// random value at render time, which blocks prerendering the page shell.
export async function googleSignInAction(formData: FormData): Promise<void> {
  if (!googleEnabled) return;
  const locale = safeLocale(formData.get("locale"));
  await signIn("google", { redirectTo: `/${locale}/today` });
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get("locale"));
  await signOut({ redirectTo: `/${locale}` });
}
