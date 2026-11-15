import {
  CircleCheckIcon,
  FlameIcon,
  FlaskConicalIcon,
  FeatherIcon,
  MoonIcon,
  SparklesIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PlanExerciseRow } from "@/components/plan/exercise-row";
import { ReasonLine, SuggestionSummary } from "@/components/today/suggestion";
import { WeekStrip } from "@/components/today/week-strip";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { pickVariant } from "@/lib/schedule";
import { getActivePlan } from "@/server/queries/plan";
import { getUserProfile } from "@/server/queries/profile";
import { getTodayView } from "@/server/queries/today";
import { requireUser } from "@/server/session";

/** Rest-day tips in the message files. */
const REST_TIPS = 5;

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
  const [profile, plan] = await Promise.all([getUserProfile(user.id), getActivePlan(user.id)]);
  if (!profile || !plan) redirect(`/${locale}/onboarding`);

  const today = await getTodayView(user.id, profile, plan);
  const t = await getTranslations("Today");
  const p = await getTranslations("Plan");
  const w = await getTranslations("Common.weekdays");

  const partOfDay = today.hour < 12 ? "morning" : today.hour < 18 ? "afternoon" : "evening";
  const firstName = user.name?.trim().split(/\s+/)[0];
  const dayName = today.day ? p(`dayTypes.${today.day.type}`) : "";
  const summary = today.day
    ? p("daySummary", {
        count: today.day.exercises.length,
        minutes: today.day.estimatedMinutes,
      })
    : "";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName
            ? t(`greeting.${partOfDay}`, { name: firstName })
            : t(`greetingNoName.${partOfDay}`)}
        </h1>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <FlameIcon
            className={today.streak > 0 ? "size-4 text-brand-text" : "size-4"}
            aria-hidden
          />
          {t("streak", { count: today.streak })}
        </p>
      </header>

      <WeekStrip week={today.week} />

      {today.kind === "training" && (
        <section
          aria-labelledby="today-title"
          className="space-y-1 rounded-3xl border border-brand/40 bg-card p-6"
        >
          <p className="text-sm font-medium text-brand-text">{t("todayLabel")}</p>
          <h2 id="today-title" className="text-2xl font-bold">
            {dayName}
          </h2>
          <p className="text-muted-foreground">{summary}</p>
        </section>
      )}

      {today.kind === "makeup" && (
        <section
          aria-labelledby="today-title"
          className="space-y-1 rounded-3xl border border-warning/50 bg-warning/10 p-6"
        >
          <p className="text-sm font-medium">{t("missedLabel")}</p>
          <h2 id="today-title" className="text-2xl font-bold">
            {dayName}
          </h2>
          <p className="text-muted-foreground">{summary}</p>
          <p className="pt-2 leading-relaxed">{t("missedBody")}</p>
        </section>
      )}

      {today.kind === "rest" && (
        <section
          aria-labelledby="today-title"
          className="flex gap-4 rounded-3xl border border-border bg-card p-6"
        >
          <MoonIcon className="mt-1 size-6 shrink-0 text-brand-text" aria-hidden />
          <div className="space-y-1.5">
            <h2 id="today-title" className="text-2xl font-bold">
              {t("restTitle")}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {t(`restTips.${pickVariant(today.date, REST_TIPS)}` as never)}
            </p>
            {today.nextWeekday !== null && (
              <p className="pt-1 text-sm font-medium">
                {t("nextWorkout", { weekday: w(`long.${today.nextWeekday}` as never) })}
              </p>
            )}
          </div>
        </section>
      )}

      {today.kind === "done" && (
        <section
          aria-labelledby="today-title"
          className="flex gap-4 rounded-3xl border border-brand/40 bg-card p-6"
        >
          <CircleCheckIcon className="mt-1 size-6 shrink-0 text-brand-text" aria-hidden />
          <div className="space-y-1.5">
            <h2 id="today-title" className="text-2xl font-bold">
              {t("doneTitle")}
            </h2>
            <p className="leading-relaxed text-muted-foreground">{t("doneBody")}</p>
            {today.nextWeekday !== null && (
              <p className="pt-1 text-sm font-medium">
                {t("nextWorkout", { weekday: w(`long.${today.nextWeekday}` as never) })}
              </p>
            )}
          </div>
        </section>
      )}

      {profile.experience === null && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5">
          <div className="min-w-0 flex-1 basis-60 space-y-1">
            <h2 className="font-semibold">{t("questionsTitle")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("questionsBody")}</p>
          </div>
          <Link href="/onboarding" className={buttonVariants({ variant: "outline", size: "xl" })}>
            {t("questionsCta")}
          </Link>
        </div>
      )}

      {today.exercises.length > 0 && (
        <section aria-labelledby="exercises-title" className="space-y-2">
          <h2 id="exercises-title" className="px-1 text-lg font-semibold">
            {t("exercisesTitle")}
          </h2>
          <ol className="rounded-3xl border border-border bg-card p-2">
            {today.exercises.map((exercise) => {
              const { suggestion } = exercise;
              return (
                <li key={exercise.id}>
                  <PlanExerciseRow exercise={exercise} locale={locale}>
                    <SuggestionSummary
                      weightKg={suggestion.weightKg}
                      lastTime={suggestion.lastTime}
                      timed={exercise.timed}
                      unitSystem={profile.unitSystem}
                    />
                    <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      {suggestion.calibration ? (
                        <FlaskConicalIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      ) : suggestion.deload ? (
                        <FeatherIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <SparklesIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      )}
                      <ReasonLine
                        reason={suggestion.reason}
                        variant={suggestion.variant}
                        timed={exercise.timed}
                        unitSystem={profile.unitSystem}
                        className="leading-snug"
                      />
                    </div>
                  </PlanExerciseRow>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-5 w-40 rounded-lg" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}
