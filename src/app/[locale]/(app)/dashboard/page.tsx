import { CircleCheckIcon, LogOutIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

// Phase 1 placeholder: proves the signed-in round trip. The real dashboard
// arrives with the program engine.
export default async function DashboardPage() {
  const locale = await getLocale();
  const t = await getTranslations("Auth");

  return (
    <>
      <header className="px-4 pt-3">
        <div className="glass mx-auto flex h-14 max-w-3xl items-center justify-between rounded-2xl ps-4 pe-2">
          <Logo />
          <div className="flex items-center gap-1">
            <LocaleSwitcher className="max-sm:[&>span]:sr-only" />
            <ThemeToggle />
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="ghost" size="lg" className="px-3">
                <LogOutIcon className="rtl:rotate-180" aria-hidden />
                <span className="max-sm:sr-only">{t("logout")}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Suspense fallback={<WelcomeSkeleton />}>
          <Welcome locale={locale} />
        </Suspense>
      </main>
    </>
  );
}

async function Welcome({ locale }: { locale: string }) {
  const user = await requireUser(locale);
  const t = await getTranslations("Dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        {user.name ? t("welcome", { name: user.name }) : t("welcomeNoName")}
      </h1>
      <div className="flex gap-4 rounded-3xl border border-border bg-card p-6">
        <CircleCheckIcon
          className="mt-0.5 size-6 shrink-0 text-brand-text"
          aria-hidden
        />
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">{t("setupTitle")}</h2>
          <p className="leading-relaxed text-muted-foreground">
            {t("setupBody")}
          </p>
        </div>
      </div>
    </div>
  );
}

function WelcomeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-9 w-64 rounded-xl" />
      <Skeleton className="h-32 rounded-3xl" />
    </div>
  );
}
