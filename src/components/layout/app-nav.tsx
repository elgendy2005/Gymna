"use client";

import {
  CalendarDaysIcon,
  DumbbellIcon,
  HouseIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type TabKey = "today" | "plan" | "exercises" | "settings";

const ITEMS: { href: string; key: TabKey; icon: LucideIcon }[] = [
  { href: "/today", key: "today", icon: HouseIcon },
  { href: "/plan", key: "plan", icon: CalendarDaysIcon },
  { href: "/exercises", key: "exercises", icon: DumbbellIcon },
  { href: "/settings", key: "settings", icon: SettingsIcon },
];

// Screens with their own bottom action bar, where tabs would get in the way.
const HIDDEN_ON = ["/onboarding", "/workout"];

/**
 * Bottom tab bar for signed-in pages. The current path is request-time data,
 * so the bar first renders with no tab marked and the marked version
 * streams in.
 */
export function AppNav() {
  return (
    <Suspense fallback={<Tabs pathname={null} />}>
      <CurrentTabs />
    </Suspense>
  );
}

function CurrentTabs() {
  return <Tabs pathname={usePathname()} />;
}

function Tabs({ pathname }: { pathname: string | null }) {
  const t = useTranslations("Nav");
  if (pathname && HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  return (
    <nav
      aria-label={t("appNav")}
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <ul className="glass mx-auto flex h-16 max-w-md items-stretch rounded-2xl p-1.5">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || Boolean(pathname?.startsWith(`${href}/`));
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium outline-none transition-colors",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "bg-brand/15 text-brand-text"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
