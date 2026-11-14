"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { hasLocale } from "next-intl";
import { Prisma } from "@/generated/prisma/client";
import { routing } from "@/i18n/routing";
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

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return { ok: false, error: "invalid_credentials" };
    }
    console.error("loginAction failed", error);
    return { ok: false, error: "server_error" };
  }
}

export async function signupAction(input: unknown): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.create({ data: { name, email, passwordHash } });
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

export async function googleSignInAction(locale: string): Promise<void> {
  if (!googleEnabled) return;
  await signIn("google", { redirectTo: `/${safeLocale(locale)}/dashboard` });
}

export async function signOutAction(locale: string): Promise<void> {
  await signOut({ redirectTo: `/${safeLocale(locale)}` });
}
