"use client";

import { LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const target = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
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
