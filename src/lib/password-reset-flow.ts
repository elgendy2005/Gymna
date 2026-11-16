import {
  consumeResetToken,
  createResetToken,
  type ResetTokenStore,
} from "@/lib/password-reset";
import { takeRateLimit, type RateLimitRule, type RateLimitStore } from "@/lib/rate-limit";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordResult,
  type ResetPasswordResult,
} from "@/lib/validation/auth";

const HOUR = 60 * 60 * 1000;
export const RESET_LIMITS = {
  perEmail: { limit: 3, windowMs: HOUR },
  perIp: { limit: 10, windowMs: HOUR },
} as const;

export type ResetEmail = { to: string; link: string; locale: string };

export type RequestDeps = {
  rateLimits: RateLimitStore;
  tokens: ResetTokenStore;
  findUser(email: string): Promise<{ email: string } | null>;
  sendEmail(email: ResetEmail): Promise<void>;
  /**
   * Runs work after the response is sent (`after()` in the server action).
   * Everything that depends on whether the account exists happens there, so
   * the answer and its timing are the same for every address.
   */
  defer(task: () => Promise<void>): void;
  linkBase: string;
  now?: Date;
};

/**
 * "Forgot password" request. Answers `{ ok: true }` for any well-formed
 * address under the rate limits, whether or not an account exists.
 */
export async function requestPasswordReset(
  input: unknown,
  context: { ip: string | null; locale: string },
  deps: RequestDeps,
): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { email } = parsed.data;
  const now = deps.now ?? new Date();

  const rules: RateLimitRule[] = [{ name: "forgot-email", value: email, ...RESET_LIMITS.perEmail }];
  if (context.ip) rules.push({ name: "forgot-ip", value: context.ip, ...RESET_LIMITS.perIp });

  let allowed: boolean;
  try {
    allowed = await takeRateLimit(deps.rateLimits, rules, now);
  } catch (error) {
    console.error("password reset rate limit failed", error);
    return { ok: false, error: "server_error" };
  }
  if (!allowed) return { ok: false, error: "rate_limited" };

  deps.defer(async () => {
    try {
      const user = await deps.findUser(email);
      if (!user) return;
      const token = await createResetToken(deps.tokens, user.email, now);
      const link = `${deps.linkBase}/${context.locale}/reset-password?token=${token}`;
      await deps.sendEmail({ to: user.email, link, locale: context.locale });
    } catch (error) {
      // Never the link or the token: only that it failed.
      console.error(
        "password reset email failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  });

  return { ok: true };
}

export type ResetDeps = {
  tokens: ResetTokenStore;
  hashPassword(password: string): Promise<string>;
  /** Sets the password; false when no account has this email any more. */
  setPassword(email: string, passwordHash: string): Promise<boolean>;
  now?: Date;
};

const TOKEN_ERRORS = {
  invalid: "token_invalid",
  expired: "token_expired",
  used: "token_used",
} as const;

/** Sets a new password with a reset token. Uses the token up on success. */
export async function resetPassword(
  token: unknown,
  input: unknown,
  deps: ResetDeps,
): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  // Validated and hashed before the token is touched, so a refused or failed
  // attempt never uses up the link.
  const passwordHash = await deps.hashPassword(parsed.data.password);
  const result = await consumeResetToken(deps.tokens, token, deps.now ?? new Date());
  if (result.status !== "valid") return { ok: false, error: TOKEN_ERRORS[result.status] };

  const updated = await deps.setPassword(result.email, passwordHash);
  return updated ? { ok: true } : { ok: false, error: "token_invalid" };
}
