"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordSchema,
  type ForgotPasswordErrorCode,
  type ForgotPasswordInput,
} from "@/lib/validation/auth";
import { forgotPasswordAction } from "@/server/actions/password-reset";

const FIELD_CLASS = "h-12 rounded-xl px-3.5 text-base md:text-base";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [formError, setFormError] = useState<ForgotPasswordErrorCode | null>(null);
  const [sent, setSent] = useState(false);
  const sentRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // The form is replaced by the confirmation; focus follows it so keyboard
  // and screen reader users land on the message.
  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    let result;
    try {
      result = await forgotPasswordAction(values, locale);
    } catch {
      result = { ok: false as const, error: "server_error" as const };
    }
    if (result.ok) setSent(true);
    else setFormError(result.error);
  }

  if (sent) {
    return (
      <div
        ref={sentRef}
        tabIndex={-1}
        role="status"
        className="flex gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <MailCheckIcon className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
        <p>{t("forgotSent")}</p>
      </div>
    );
  }

  const emailError = errors.email?.message;

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
        {emailError && (
          <p id="email-error" className="text-sm text-destructive">
            {t(`errors.${emailError}` as never)}
          </p>
        )}
      </div>

      <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        {isSubmitting ? t("sendingLink") : t("sendLink")}
      </Button>
    </form>
  );
}
