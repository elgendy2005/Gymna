import { timezoneSchema } from "@/lib/validation/onboarding";

/**
 * The zone to save after a sign-in, or null to leave the saved one alone.
 * The browser's zone wins when it is a real IANA name and differs, so
 * "today" follows someone who travels or moves.
 */
export function timezoneToSave(saved: string, browser: unknown): string | null {
  const parsed = timezoneSchema.safeParse(browser);
  if (!parsed.success || parsed.data === saved) return null;
  return parsed.data;
}

/** The zone this browser runs in, if it reports one. Client-side only. */
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
