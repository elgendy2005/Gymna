import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Marketing header. `minimal` drops the section links for the auth pages. */
export async function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const t = await getTranslations("Nav");

  return (
    <header className="sticky top-0 z-50 px-4 pt-3">
      <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-2xl ps-4 pe-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {/* The accessible name keeps the visible wordmark: "Gymna, Home". */}
          <Logo />
          <span className="sr-only">, {t("home")}</span>
        </Link>

        {!minimal && (
          <nav aria-label={t("primary")} className="hidden items-center gap-1 md:flex">
            {(
              [
                ["#features", t("features")],
                ["#how", t("howItWorks")],
              ] as const
            ).map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-1">
          <LocaleSwitcher className="max-sm:[&>span]:sr-only" />
          <ThemeToggle />
          {!minimal && (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "hidden h-11 px-3 sm:inline-flex",
                )}
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "lg" }), "h-11 px-4 font-semibold")}
              >
                {t("getStarted")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
