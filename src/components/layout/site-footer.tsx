import { ShieldAlertIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shared/logo";

// The copyright year is fixed at build time on purpose: reading the clock
// during render would make every page that shows the footer dynamic.
const BUILD_YEAR = 2026;

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <Logo />
        <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
          <ShieldAlertIcon
            className="mt-0.5 size-5 shrink-0 text-warning"
            aria-hidden
          />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("disclaimerTitle")}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {t("disclaimer")}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("rights", { year: BUILD_YEAR })}
        </p>
      </div>
    </footer>
  );
}
