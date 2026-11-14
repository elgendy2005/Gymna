"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useTheme } from "./use-theme";

export function ThemeToggle() {
  const t = useTranslations("Nav");
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={isDark ? t("themeToLight") : t("themeToDark")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      suppressHydrationWarning
    >
      <SunIcon className="hidden size-4.5 dark:block" aria-hidden />
      <MoonIcon className="size-4.5 dark:hidden" aria-hidden />
    </Button>
  );
}
