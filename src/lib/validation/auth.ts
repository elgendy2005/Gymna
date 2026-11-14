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

export const signupSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(60, "nameTooLong"),
  email,
  // bcrypt only reads the first 72 bytes, so longer passwords are refused
  // rather than silently truncated.
  password: z
    .string()
    .min(8, "passwordTooShort")
    .max(72, "passwordTooLong")
    .regex(/\p{L}/u, "passwordWeak")
    .regex(/\d/, "passwordWeak"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_taken"
  | "invalid_input"
  | "server_error";

export type AuthActionResult = { ok: true } | { ok: false; error: AuthErrorCode };
