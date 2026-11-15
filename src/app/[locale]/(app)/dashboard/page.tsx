import {
  CalendarDaysIcon,
  CircleCheckIcon,
  DumbbellIcon,
  GaugeIcon,
  PencilIcon,
  ShieldAlertIcon,
  TargetIcon,
  TimerIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { bmiCategory, calculateBmi } from "@/lib/bmi";
import { flaggedQuestions } from "@/lib/health";
import { getUserProfile } from "@/server/queries/profile";
import { requireUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("metaTitle") };
}

export default async function DashboardPage() {
  const locale = await getLocale();

  return (
    <div className="pb-10">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard locale={locale} />
      </Suspense>
    </div>
  );
}

async function Dashboard({ locale }: { locale: string }) {
  const user = await requireUser(locale);
  const profile = await getUserProfile(user.id);
  if (!profile) redirect(`/${locale}/onboarding`);

  const t = await getTranslations("Dashboard");
  const o = await getTranslations("Onboarding");

  const bmi = calculateBmi(profile.weightKg, profile.heightCm);
  const flagged = flaggedQuestions(profile.health);

  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: TargetIcon, label: o("review.goal"), value: o(`goal.${profile.goal}.title`) },
    { icon: TrendingUpIcon, label: o("review.level"), value: o(`level.${profile.level}.title`) },
    {
      icon: CalendarDaysIcon,
      label: o("review.days"),
      value: o("schedule.daysValue", { count: profile.daysPerWeek }),
    },
    {
      icon: TimerIcon,
      label: o("review.session"),
      value: o("schedule.minutes", { count: profile.sessionMinutes }),
    },
    {
      icon: DumbbellIcon,
      label: o("review.equipment"),
      value: o(`schedule.${profile.equipment}.title`),
    },
    ...(bmi === null
      ? []
      : [
          {
            icon: GaugeIcon,
            label: o("review.bmi"),
            value: `${bmi.toFixed(1)} · ${o(`bmi.${bmiCategory(bmi)}`)}`,
          },
        ]),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        {user.name ? t("welcome", { name: user.name }) : t("welcomeNoName")}
      </h1>

      {profile.needsClearance && (
        <div
          role="status"
          className="flex gap-3 rounded-3xl border border-warning/50 bg-warning/10 p-5"
        >
          <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div className="space-y-1">
            <h2 className="font-semibold">{t("clearanceTitle")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("clearanceBody", {
                items: flagged
                  .map((question) => o(`flagLabels.${question}`))
                  .join(locale === "ar" ? "، " : ", "),
              })}
            </p>
          </div>
        </div>
      )}

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

      <section aria-labelledby="profile-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="profile-title" className="text-xl font-semibold">
            {t("profileTitle")}
          </h2>
          <Link
            href="/onboarding"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <PencilIcon aria-hidden />
            {t("editAnswers")}
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="size-5 text-brand-text" aria-hidden />
              <dt className="mt-3 text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 font-semibold text-pretty">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-9 w-64 rounded-xl" />
      <Skeleton className="h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
