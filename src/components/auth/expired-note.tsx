"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

/**
 * "Your session ended" on the login page. It is the only part of the page
 * that reads the query string, so it sits in its own Suspense boundary and
 * the form itself is prerendered.
 */
export function ExpiredNote() {
  const t = useTranslations("Auth");
  const searchParams = useSearchParams();
  if (!searchParams.has("expired")) return null;

  return (
    <p
      role="status"
      className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-muted-foreground"
    >
      {t("expired")}
    </p>
  );
}
