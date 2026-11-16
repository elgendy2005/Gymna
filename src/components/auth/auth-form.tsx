"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import {
  loginSchema,
  signupSchema,
  type AuthErrorCode,
  type SignupInput,
} from "@/lib/validation/auth";
import { browserTimeZone } from "@/lib/timezone";
import { loginAction, signupAction } from "@/server/actions/auth";

type Mode = "login" | "signup";

// Only same-site, locale-prefixed paths are accepted as a return target.
const SAFE_NEXT = /^\/(ar|en)\/[\w\-/]*$/;

const FIELD_CLASS = "h-12 rounded-xl px-3.5 text-base md:text-base";

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<AuthErrorCode | null>(null);

  const isSignup = mode === "signup";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    // The login schema has no `name`; the field is not rendered in that mode.
    resolver: zodResolver(isSignup ? signupSchema : loginSchema) as never,
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignupInput) {
    setFormError(null);
    let result;
    try {
      const zone = browserTimeZone();
      result = isSignup
        ? await signupAction(values, zone)
        : await loginAction({ email: values.email, password: values.password }, zone);
    } catch {
      result = { ok: false as const, error: "server_error" as const };
    }

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    // A full navigation, so every server component renders with the new
    // session cookie. A new account has no profile yet, so it goes straight
    // to onboarding; every other screen would only redirect there.
    // `next` is read here, not with useSearchParams(): that hook would keep
    // the whole form out of the prerendered HTML.
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.assign(
      isSignup
        ? `/${locale}/onboarding`
        : next && SAFE_NEXT.test(next)
          ? next
          : `/${locale}/today`,
    );
  }

  const fieldError = (key: keyof SignupInput) => {
    const message = errors[key]?.message;
    return message ? t(`errors.${message}` as never) : null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
        >
          {t(`errors.${formError}`)}
        </p>
      )}

      {isSignup && (
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className={FIELD_CLASS}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-destructive">
              {fieldError("name")}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder={t("emailPlaceholder")}
          className={`${FIELD_CLASS} rtl:text-right`}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {fieldError("email")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            dir="ltr"
            className={`${FIELD_CLASS} pe-12 rtl:text-right`}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password
                ? "password-error"
                : isSignup
                  ? "password-hint"
                  : undefined
            }
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="absolute end-1.5 top-1.5"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((shown) => !shown)}
          >
            {showPassword ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
          </Button>
        </div>
        {errors.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {fieldError("password")}
          </p>
        ) : (
          isSignup && (
            <p id="password-hint" className="text-sm text-muted-foreground">
              {t("passwordHint")}
            </p>
          )
        )}
        {!isSignup && (
          <p className="text-end text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-brand-text underline-offset-4 hover:underline"
            >
              {t("forgotLink")}
            </Link>
          </p>
        )}
      </div>

      <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        {isSubmitting
          ? isSignup
            ? t("signingUp")
            : t("loggingIn")
          : isSignup
            ? t("signup")
            : t("login")}
      </Button>
    </form>
  );
}
