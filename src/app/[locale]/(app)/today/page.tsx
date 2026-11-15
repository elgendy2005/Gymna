import { CircleCheckIcon, DumbbellIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getUserProfile } from "@/server/queries/profile";
import { requireUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Today");
  return { title: t("metaTitle") };
}

export default async function TodayPage() {
  const locale = await getLocale();

  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today locale={locale} />
    </Suspense>
  );
}

async function Today({ locale }: { locale: string }) {
  const user = await requireUser(locale);
  const profile = await getUserProfile(user.id);
  if (!profile) redirect(`/${locale}/onboarding`);

  const t = await getTranslations("Today");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        {user.name ? t("welcome", { name: user.name }) : t("welcomeNoName")}
      </h1>

      <div className="flex gap-4 rounded-3xl border border-brand/30 bg-card p-6">
        <CircleCheckIcon className="mt-0.5 size-6 shrink-0 text-brand-text" aria-hidden />
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">{t("planSoonTitle")}</h2>
          <p className="leading-relaxed text-muted-foreground">{t("planSoonBody")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="min-w-0 flex-1 basis-60 space-y-1.5">
          <h2 className="text-lg font-semibold">{t("libraryTitle")}</h2>
          <p className="leading-relaxed text-muted-foreground">{t("libraryBody")}</p>
        </div>
        <Link href="/exercises" className={buttonVariants({ size: "xl" })}>
          <DumbbellIcon aria-hidden />
          {t("libraryCta")}
        </Link>
      </div>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-9 w-64 rounded-xl" />
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-28 rounded-3xl" />
    </div>
  );
}
