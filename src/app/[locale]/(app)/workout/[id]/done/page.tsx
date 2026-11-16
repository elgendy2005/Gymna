import {
  ClockIcon,
  DumbbellIcon,
  FlameIcon,
  LayersIcon,
  PartyPopperIcon,
  TrophyIcon,
  WeightIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Confetti } from "@/components/workout/confetti";
import { Link } from "@/i18n/navigation";
import { formatRounded, formatWeight } from "@/lib/format";
import { pickVariant } from "@/lib/schedule";
import { COOLDOWN_VARIANTS, cooldownGroup, parseCooldownKey } from "@/lib/workout";
import { getActivePlan } from "@/server/queries/plan";
import { getUserProfile } from "@/server/queries/profile";
import { getStreak } from "@/server/queries/today";
import { getWorkoutSummary } from "@/server/queries/workout";
import { requireUser } from "@/server/session";

type Props = PageProps<"/[locale]/workout/[id]/done">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Finish");
  return { title: t("metaTitle") };
}

export default async function DonePage({ params }: Props) {
  const locale = await getLocale();
  return (
    <Suspense fallback={<DoneSkeleton />}>
      <Done locale={locale} id={params.then((value) => value.id)} />
    </Suspense>
  );
}

async function Done({ locale, id }: { locale: string; id: Promise<string> }) {
  const user = await requireUser(locale);
  const [profile, plan, summary] = await Promise.all([
    getUserProfile(user.id),
    getActivePlan(user.id),
    getWorkoutSummary(user.id, await id),
  ]);
  if (!profile || !plan) redirect(`/${locale}/onboarding`);
  if (!summary) notFound();

  const { streak, nextWeekday } = await getStreak(user.id, profile, plan);
  const t = await getTranslations("Finish");
  const p = await getTranslations("Plan");
  const c = await getTranslations("Common");
  const units = { kg: c("kg"), lb: c("lb") };
  const weight = (kg: number) => formatWeight(kg, profile.unitSystem, units);
  const nameOf = (item: { nameAr: string | null; nameEn: string }) =>
    (locale === "ar" && item.nameAr) || item.nameEn;

  // Sessions closed automatically have no stored message: pick a stable one.
  const cooldown = parseCooldownKey(summary.cooldownKey) ?? {
    group: cooldownGroup(summary.dayType, profile.needsClearance),
    variant: pickVariant(summary.id, COOLDOWN_VARIANTS),
  };

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    {
      icon: ClockIcon,
      label: t("duration"),
      value: t("minutes", { count: Math.max(1, Math.round(summary.durationSeconds / 60)) }),
    },
    { icon: DumbbellIcon, label: t("exercises"), value: String(summary.exercises.length) },
    { icon: LayersIcon, label: t("sets"), value: String(summary.setCount) },
    {
      icon: WeightIcon,
      label: t("volume"),
      value: formatRounded(summary.totalVolumeKg, profile.unitSystem, units),
    },
  ];

  return (
    <div className="space-y-6">
      <Confetti />

      <header className="space-y-2 pt-4 text-center">
        <PartyPopperIcon className="mx-auto size-12 text-brand-text" aria-hidden />
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle", { day: p(`dayTypes.${summary.dayType}`) })}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon className="size-5 text-brand-text" aria-hidden />
            <dt className="mt-3 text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums">
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>

      <p className="flex items-center justify-center gap-2 rounded-2xl border border-brand/40 bg-brand/10 p-4 text-lg font-semibold">
        <FlameIcon className="size-5 text-brand-text" aria-hidden />
        {t("streak", { count: streak })}
      </p>

      {summary.records.length > 0 && (
        <section aria-labelledby="records-title" className="space-y-2">
          <h2 id="records-title" className="px-1 text-lg font-semibold">
            {t("recordsTitle")}
          </h2>
          <ul className="space-y-2">
            {summary.records.map((record) => (
              <li
                key={record.slug}
                className="flex items-center gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-3"
              >
                <TrophyIcon className="size-5 shrink-0 text-warning" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{nameOf(record)}</p>
                  <p className="text-sm text-muted-foreground">
                    <bdi>
                      {weight(record.weightKg)} × {record.reps}
                    </bdi>
                    {" · "}
                    {t("estimatedMax", {
                      weight: formatRounded(record.e1rmKg, profile.unitSystem, units, 1),
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="cooldown-title" className="rounded-3xl border border-border bg-card p-5">
        <h2 id="cooldown-title" className="font-semibold">
          {t("cooldownTitle")}
        </h2>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">
          {t(`cooldown.${cooldown.group}.${cooldown.variant}` as never)}
        </p>
      </section>

      <section aria-labelledby="log-title" className="space-y-2">
        <h2 id="log-title" className="px-1 text-lg font-semibold">
          {t("logTitle")}
        </h2>
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card px-4">
          {summary.exercises.map((exercise) => (
            <li key={exercise.slug} className="py-3">
              <p className="font-medium">{nameOf(exercise)}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                <bdi>
                  {exercise.sets
                    .map((set) =>
                      set.weightKg === null
                        ? exercise.timed
                          ? t("seconds", { count: set.reps })
                          : String(set.reps)
                        : `${weight(set.weightKg)} × ${set.reps}`,
                    )
                    .join("  ·  ")}
                </bdi>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {nextWeekday !== null && (
        <p className="text-center text-sm text-muted-foreground">
          {t("next", { weekday: c(`weekdays.long.${nextWeekday}` as never) })}
        </p>
      )}

      <Link href="/today" className={buttonVariants({ size: "xl", className: "h-14 w-full text-lg" })}>
        {t("backToToday")}
      </Link>
    </div>
  );
}

function DoneSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="mx-auto h-24 w-56 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}
