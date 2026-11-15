"use client";

import { LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SwitcherProps = { className?: string };

/**
 * Links to the current page in the other language. On routes with dynamic
 * segments the pathname is only known at request time, so the link that
 * reads it streams in; until then the same button points at the home page.
 */
export function LocaleSwitcher({ className }: SwitcherProps) {
  return (
    <Suspense fallback={<SwitcherLink href="/" className={className} />}>
      <CurrentPageSwitcher className={className} />
    </Suspense>
  );
}

function CurrentPageSwitcher({ className }: SwitcherProps) {
  const pathname = usePathname();
  return <SwitcherLink href={pathname} className={className} />;
}

function SwitcherLink({ href, className }: SwitcherProps & { href: string }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const target = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={href}
      locale={target}
      lang={target}
      aria-label={t("switchLanguageLabel")}
      className={cn(
        buttonVariants({ variant: "ghost", size: "lg" }),
        "gap-2 px-3",
        className,
      )}
    >
      <LanguagesIcon className="size-4.5" aria-hidden />
      <span>{t("switchLanguage")}</span>
    </Link>
  );
}
