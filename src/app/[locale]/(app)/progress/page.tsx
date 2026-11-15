import { TrendingUpIcon, TrophyIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ExerciseStatsView } from "@/components/progress/exercise-stats";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getUserProfile } from "@/server/queries/profile";
import { getExerciseStats, getTrackedExercises } from "@/server/queries/stats";
import { requireUser } from "@/server/session";

type Props = PageProps<"/[locale]/progress">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Progress");
  return { title: t("metaTitle") };
}

export default async function ProgressPage({ searchParams }: Props) {
  const locale = await getLocale();
  const t = await getTranslations("Progress");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<ProgressSkeleton />}>
        <Progress
          locale={locale}
          picked={searchParams.then((value) =>
            typeof value.exercise === "string" ? value.exercise : null,
          )}
        />
      </Suspense>
    </div>
  );
}

async function Progress({ locale, picked }: { locale: string; picked: Promise<string | null> }) {
  const user = await requireUser(locale);
  const [profile, tracked] = await Promise.all([
    getUserProfile(user.id),
    getTrackedExercises(user.id),
  ]);
  if (!profile) redirect(`/${locale}/onboarding`);

  const t = await getTranslations("Progress");
  const c = await getTranslations("Common");
  const format = await getFormatter();
  const units = { kg: c("kg"), lb: c("lb") };
  const nameOf = (item: { nameAr: string | null; nameEn: string }) =>
    (locale === "ar" && item.nameAr) || item.nameEn;

  if (tracked.length === 0) {
    return (
      <div className="space-y-4 rounded-3xl border border-border bg-card p-8 text-center">
        <TrendingUpIcon className="mx-auto size-10 text-brand-text" aria-hidden />
        <h2 className="text-xl font-semibold">{t("emptyTitle")}</h2>
        <p className="leading-relaxed text-muted-foreground">{t("emptyBody")}</p>
        <Link href="/today" className={buttonVariants({ size: "xl" })}>
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  const wanted = await picked;
  const current = tracked.find((exercise) => exercise.slug === wanted) ?? tracked[0];
  const stats = await getExerciseStats(user.id, current.slug);
  const records = tracked
    .filter((exercise) => exercise.bestE1rmKg !== null)
    .sort((a, b) => (b.bestE1rmAt ?? "").localeCompare(a.bestE1rmAt ?? ""));

  return (
    <>
      <section aria-labelledby="exercise-title" className="space-y-3">
        <h2 id="exercise-title" className="sr-only">
          {t("pickerLabel")}
        </h2>
        <nav aria-label={t("pickerLabel")} className="-mx-4 overflow-x-auto px-4 pb-1">
          <ul className="flex w-max gap-2">
            {tracked.map((exercise) => {
              const active = exercise.slug === current.slug;
              return (
                <li key={exercise.slug}>
                  <Link
                    href={`/progress?exercise=${encodeURIComponent(exercise.slug)}`}
                    aria-current={active ? "true" : undefined}
                    scroll={false}
                    className={cn(
                      "flex h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      active
                        ? "border-brand bg-brand text-primary-foreground"
                        : "border-border bg-card hover:border-input",
                    )}
                  >
                    {nameOf(exercise)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-baseline justify-between gap-3 px-1">
          <p className="text-xl font-semibold">{nameOf(current)}</p>
          <Link
            href={`/exercises/${current.slug}`}
            className="shrink-0 text-sm font-medium text-brand-text underline-offset-4 hover:underline"
          >
            {t("openExercise")}
          </Link>
        </div>
        {stats && <ExerciseStatsView stats={stats} unitSystem={profile.unitSystem} />}
      </section>

      {records.length > 0 && (
        <section aria-labelledby="records-title" className="space-y-2">
          <h2 id="records-title" className="px-1 text-xl font-semibold">
            {t("recordsTitle")}
          </h2>
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card px-4">
            {records.map((record) => (
              <li key={record.slug} className="flex items-center gap-3 py-3">
                <TrophyIcon className="size-5 shrink-0 text-warning" aria-hidden />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/progress?exercise=${encodeURIComponent(record.slug)}`}
                    className="block truncate font-medium underline-offset-4 hover:underline"
                  >
                    {nameOf(record)}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {record.bestE1rmAt &&
                      format.dateTime(new Date(record.bestE1rmAt), {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: profile.timezone,
                      })}
                  </p>
                </div>
                <p className="shrink-0 text-end">
                  <bdi className="block font-bold tabular-nums">
                    {formatWeight(Math.round(record.bestE1rmKg! * 10) / 10, profile.unitSystem, units)}
                  </bdi>
                  <span className="text-xs text-muted-foreground">{t("estimatedMax")}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-11 rounded-full" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}
