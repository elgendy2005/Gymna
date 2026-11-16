"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import {
  resetPasswordSchema,
  type ResetPasswordErrorCode,
  type ResetPasswordInput,
} from "@/lib/validation/auth";
import { resetPasswordAction } from "@/server/actions/password-reset";

const FIELD_CLASS = "h-12 rounded-xl px-3.5 text-base md:text-base";
const REDIRECT_DELAY_MS = 2500;
const LOGIN_HREF = { pathname: "/login", query: { reset: "1" } } as const;

const TOKEN_ERRORS: ResetPasswordErrorCode[] = ["token_invalid", "token_expired", "token_used"];

function PasswordField({
  id,
  label,
  error,
  hint,
  shown,
  onToggle,
  registration,
}: {
  id: string;
  label: string;
  error: string | null;
  hint?: string;
  shown: boolean;
  onToggle: () => void;
  registration: UseFormRegisterReturn;
}) {
  const t = useTranslations("Auth");
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          dir="ltr"
          className={`${FIELD_CLASS} pe-12 rtl:text-right`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...registration}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="absolute end-1.5 top-1.5"
          aria-label={shown ? t("hidePassword") : t("showPassword")}
          aria-pressed={shown}
          aria-controls={id}
          onClick={onToggle}
        >
          {shown ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<ResetPasswordErrorCode | null>(null);
  const [done, setDone] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    if (!done) return;
    doneRef.current?.focus();
    // Replace, so Back does not return to the spent link.
    const timer = window.setTimeout(() => router.replace(LOGIN_HREF), REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [done, router]);

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);
    let result;
    try {
      result = await resetPasswordAction(token, values);
    } catch {
      result = { ok: false as const, error: "server_error" as const };
    }
    if (result.ok) setDone(true);
    else setFormError(result.error);
  }

  if (done) {
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="space-y-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <p className="flex gap-3">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
          {t("resetDone")}
        </p>
        <Link
          href={LOGIN_HREF}
          replace
          className="inline-block font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          {t("loginNow")}
        </Link>
      </div>
    );
  }

  const fieldError = (key: keyof ResetPasswordInput) => {
    const message = errors[key]?.message;
    return message ? t(`errors.${message}` as never) : null;
  };
  const tokenProblem = formError !== null && TOKEN_ERRORS.includes(formError);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && (
        <div
          role="alert"
          className="space-y-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
        >
          <p>{t(`errors.${formError}`)}</p>
          {tokenProblem && (
            <Link
              href="/forgot-password"
              className="inline-block font-semibold underline underline-offset-4"
            >
              {t("requestNewLink")}
            </Link>
          )}
        </div>
      )}

      <PasswordField
        id="password"
        label={t("newPassword")}
        error={fieldError("password")}
        hint={t("passwordHint")}
        shown={showPassword}
        onToggle={() => setShowPassword((shown) => !shown)}
        registration={register("password")}
      />
      <PasswordField
        id="confirm"
        label={t("confirmPassword")}
        error={fieldError("confirm")}
        shown={showPassword}
        onToggle={() => setShowPassword((shown) => !shown)}
        registration={register("confirm")}
      />

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={isSubmitting || tokenProblem}
      >
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        {isSubmitting ? t("savingPassword") : t("savePassword")}
      </Button>
    </form>
  );
}
