import { LogOutIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signOutAction } from "@/server/actions/auth";

/** Header for signed-in pages. Reads no session data, so it prerenders. */
export async function AppHeader() {
  const locale = await getLocale();
  const t = await getTranslations();

  return (
    <header className="sticky top-0 z-40 px-4 pt-3">
      <div className="glass mx-auto flex h-14 max-w-3xl items-center justify-between rounded-2xl ps-4 pe-2">
        <Link
          href="/today"
          aria-label={t("Nav.home")}
          className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitcher className="max-sm:[&>span]:sr-only" />
          <ThemeToggle />
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="ghost" size="lg" className="px-3">
              <LogOutIcon className="rtl:rotate-180" aria-hidden />
              <span className="max-sm:sr-only">{t("Auth.logout")}</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
