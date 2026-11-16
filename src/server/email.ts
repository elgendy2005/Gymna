import "server-only";
import { renderPasswordResetEmail } from "@/lib/email/password-reset-email";
import type { ResetEmail } from "@/lib/password-reset-flow";

const RESEND_URL = "https://api.resend.com/emails";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Sends the reset email through Resend's HTTP API. Both settings are read
 * at call time. Without RESEND_API_KEY outside production, nothing is sent
 * and the link is printed to the server console for local testing; in
 * production the link is never logged.
 */
export async function sendPasswordResetEmail({ to, link, locale }: ResetEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    if (isProduction) throw new Error("RESEND_API_KEY is not set; reset email not sent");
    console.info(`[dev] RESEND_API_KEY is not set, so no email was sent.\n[dev] Password reset link for ${to}: ${link}`);
    return;
  }
  if (!from) throw new Error("EMAIL_FROM is not set; reset email not sent");

  const { subject, html, text } = renderPasswordResetEmail(locale, link);
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // Resend's error name and message describe the request (bad sender,
    // unverified domain), never the content we sent.
    let detail = "";
    try {
      const body = (await response.json()) as { name?: string; message?: string };
      detail = [body.name, body.message].filter(Boolean).join(": ");
    } catch {
      // Not JSON; the status alone is reported.
    }
    throw new Error(`Resend answered ${response.status}${detail ? ` (${detail})` : ""}`);
  }
}
