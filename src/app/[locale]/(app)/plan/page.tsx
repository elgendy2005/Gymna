import { InfoIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PlanExerciseRow } from "@/components/plan/exercise-row";
import { RegeneratePlan } from "@/components/plan/regenerate-plan";
import { Skeleton } from "@/components/ui/skeleton";
import { isPlanRepetitive } from "@/lib/program-engine";
import { getActivePlan } from "@/server/queries/plan";
import { getUserProfile } from "@/server/queries/profile";
import { requireUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Plan");
  return { title: t("metaTitle") };
}

export default async function PlanPage() {
  const locale = await getLocale();
  const t = await getTranslations("Plan");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<PlanSkeleton />}>
        <Plan locale={locale} />
      </Suspense>
    </div>
  );
}

async function Plan({ locale }: { locale: string }) {
  const user = await requireUser(locale);
  const [profile, plan] = await Promise.all([getUserProfile(user.id), getActivePlan(user.id)]);
  if (!profile || !plan) redirect(`/${locale}/onboarding`);

  const t = await getTranslations("Plan");
  const w = await getTranslations("Common.weekdays");

  return (
    <>
      <p className="-mt-3 text-muted-foreground">
        {t("subtitle", { days: plan.days.length, split: t(`splits.${plan.split}`) })}
      </p>

      {profile.needsClearance && (
        <p className="flex items-center gap-2.5 rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <ShieldCheckIcon className="size-5 shrink-0 text-warning" aria-hidden />
          {t("cautious")}
        </p>
      )}

      {isPlanRepetitive(plan.days) && (
        <p className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          {t(profile.needsClearance ? "limitedHealth" : "limited")}
        </p>
      )}

      <ol className="space-y-4">
        {plan.days.map((day) => (
          <li key={day.id}>
            <section
              aria-labelledby={`day-${day.id}`}
              className="rounded-3xl border border-border bg-card p-3"
            >
              <header className="flex items-baseline justify-between gap-3 px-2 pt-2 pb-3">
                <div>
                  <p className="text-sm font-medium text-brand-text">
                    {w(`long.${day.weekday}` as never)}
                  </p>
                  <h2 id={`day-${day.id}`} className="text-xl font-semibold">
                    {t(`dayTypes.${day.type}`)}
                  </h2>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {t("daySummary", {
                    count: day.exercises.length,
                    minutes: day.estimatedMinutes,
                  })}
                </p>
              </header>
              <ol>
                {day.exercises.map((exercise) => (
                  <li key={exercise.id}>
                    <PlanExerciseRow exercise={exercise} locale={locale} />
                  </li>
                ))}
              </ol>
            </section>
          </li>
        ))}
      </ol>

      <RegeneratePlan />
    </>
  );
}

function PlanSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-5 w-48 rounded-lg" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-80 rounded-3xl" />
      ))}
    </div>
  );
}
