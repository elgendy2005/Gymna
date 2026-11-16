import { z } from "zod";

// Messages are translation keys under `Auth.errors`, so the same schema
// serves the form (translated on the client) and the server action.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("emailInvalid").max(254, "emailInvalid"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "passwordRequired").max(72, "passwordTooLong"),
});

// bcrypt only reads the first 72 bytes, so longer passwords are refused
// rather than silently truncated. Shared by signup and password reset.
const newPassword = z
  .string()
  .min(8, "passwordTooShort")
  .max(72, "passwordTooLong")
  .regex(/\p{L}/u, "passwordWeak")
  .regex(/\d/, "passwordWeak");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(60, "nameTooLong"),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirm: z.string().min(1, "confirmRequired").max(72, "passwordTooLong"),
  })
  .refine((value) => value.password === value.confirm, {
    message: "passwordMismatch",
    path: ["confirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type ForgotPasswordErrorCode = "invalid_input" | "rate_limited" | "server_error";
export type ForgotPasswordResult = { ok: true } | { ok: false; error: ForgotPasswordErrorCode };

export type ResetPasswordErrorCode =
  | "invalid_input"
  | "token_invalid"
  | "token_expired"
  | "token_used"
  | "server_error";
export type ResetPasswordResult = { ok: true } | { ok: false; error: ResetPasswordErrorCode };

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_taken"
  | "invalid_input"
  | "server_error";

export type AuthActionResult = { ok: true } | { ok: false; error: AuthErrorCode };
