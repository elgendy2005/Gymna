import {
  ArrowLeftIcon,
  CircleAlertIcon,
  ShieldAlertIcon,
  WindIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ExerciseDemo } from "@/components/exercise/exercise-demo";
import { MuscleMap } from "@/components/exercise/muscle-map";
import { ExerciseStatsView } from "@/components/progress/exercise-stats";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getExercise } from "@/server/queries/exercises";
import { getUserProfile } from "@/server/queries/profile";
import { getExerciseStats } from "@/server/queries/stats";
import { requireUser } from "@/server/session";

type Props = PageProps<"/[locale]/exercises/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const exercise = await getExercise(slug);
  if (!exercise) return {};
  return { title: (locale === "ar" && exercise.nameAr) || exercise.nameEn };
}

export default async function ExercisePage({ params }: Props) {
  const locale = await getLocale();
  const t = await getTranslations("Exercises");

  return (
    <div className="space-y-6 pb-10">
      <Link
        href="/exercises"
        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "-ms-2.5")}
      >
        <ArrowLeftIcon className="rtl:rotate-180" aria-hidden />
        {t("backToLibrary")}
      </Link>
      <Suspense fallback={<ExerciseSkeleton />}>
        <Exercise locale={locale} slug={params.then((value) => value.slug)} />
      </Suspense>
    </div>
  );
}

async function Exercise({ locale, slug }: { locale: string; slug: Promise<string> }) {
  const user = await requireUser(locale);
  const [exercise, profile, stats] = await Promise.all([
    getExercise(await slug),
    getUserProfile(user.id),
    slug.then((value) => getExerciseStats(user.id, value)),
  ]);
  if (!exercise) notFound();

  const t = await getTranslations("Exercises");
  const arabic = locale === "ar";
  const comma = arabic ? "، " : ", ";

  // Curated exercises carry Arabic text; the rest fall back to English.
  const name = (arabic && exercise.nameAr) || exercise.nameEn;
  const stepsInArabic = arabic && exercise.instructionsAr.length > 0;
  const steps = stepsInArabic ? exercise.instructionsAr : exercise.instructionsEn;
  const mistakes = arabic ? exercise.mistakesAr : exercise.mistakesEn;
  const breathing = arabic ? exercise.breathingAr : exercise.breathingEn;
  const englishFallback = arabic && !stepsInArabic;

  const muscleNames = (muscles: readonly string[]) =>
    muscles.map((muscle) => t(`muscles.${muscle}`)).join(comma);
  const tagNames = (tags: readonly string[]) =>
    tags.map((tag) => t(`tags.${tag}`)).join(comma);

  // Tags this user's health check told us to avoid.
  const flagged = exercise.contraindications.filter((tag) =>
    profile?.contraindications.includes(tag),
  );
  const otherCautions = exercise.contraindications.filter((tag) => !flagged.includes(tag));

  const facts = [
    t(`level.${exercise.difficulty}`),
    t(`equipment.${exercise.equipment}`),
    t(`category.${exercise.category}`),
    exercise.isCompound ? t("compound") : t("isolation"),
  ];

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <h1
          lang={arabic && !exercise.nameAr ? "en" : undefined}
          dir={arabic && !exercise.nameAr ? "auto" : undefined}
          className="text-3xl font-bold tracking-tight text-balance"
        >
          {name}
        </h1>
        {arabic && exercise.nameAr && (
          <p lang="en" dir="ltr" className="text-start text-sm text-muted-foreground">
            {exercise.nameEn}
          </p>
        )}
        <ul className="flex flex-wrap gap-2">
          {facts.map((fact) => (
            <li
              key={fact}
              className="rounded-full border border-border bg-card px-3 py-1 text-sm"
            >
              {fact}
            </li>
          ))}
        </ul>
      </header>

      {flagged.length > 0 && (
        <div
          role="status"
          className="flex gap-3 rounded-3xl border border-warning/50 bg-warning/10 p-5"
        >
          <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div className="space-y-1">
            <h2 className="font-semibold">{t("personalTitle")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("personalBody", { items: tagNames(flagged) })}
            </p>
          </div>
        </div>
      )}

      <ExerciseDemo
        media={exercise.media}
        alt={t("demoAlt", { name })}
        labels={{ play: t("play"), pause: t("pause"), empty: t("noDemo") }}
      />

      <section aria-labelledby="muscles-title" className="rounded-3xl border border-border bg-card p-5">
        <h2 id="muscles-title" className="text-xl font-semibold">
          {t("musclesTitle")}
        </h2>
        <MuscleMap
          className="mt-4"
          primary={exercise.primaryMuscles}
          secondary={exercise.secondaryMuscles}
          label={t("mapLabel", { muscles: muscleNames(exercise.primaryMuscles) })}
          frontLabel={t("front")}
          backLabel={t("back")}
        />
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {/* A <dl> group may only hold <dt>/<dd>, so the legend dot sits inside the <dt>. */}
          <div className="relative ps-5.5">
            <dt className="text-muted-foreground">
              <span className="absolute start-0 top-1 size-3 rounded-full bg-brand" aria-hidden />
              {t("primary")}
            </dt>
            <dd className="font-medium">{muscleNames(exercise.primaryMuscles)}</dd>
          </div>
          {exercise.secondaryMuscles.length > 0 && (
            <div className="relative ps-5.5">
              <dt className="text-muted-foreground">
                <span className="absolute start-0 top-1 size-3 rounded-full bg-brand/35" aria-hidden />
                {t("secondary")}
              </dt>
              <dd className="font-medium">{muscleNames(exercise.secondaryMuscles)}</dd>
            </div>
          )}
        </dl>
      </section>

      {exercise.requirements.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("alsoNeeds", {
            items: exercise.requirements
              .map((requirement) => t(`requirements.${requirement}`))
              .join(comma),
          })}
        </p>
      )}

      {steps.length > 0 && (
        <section aria-labelledby="steps-title" className="space-y-3">
          <h2 id="steps-title" className="text-xl font-semibold">
            {t("stepsTitle")}
          </h2>
          {englishFallback && (
            <p className="text-sm text-muted-foreground">{t("englishOnly")}</p>
          )}
          <ol
            lang={englishFallback ? "en" : undefined}
            dir={englishFallback ? "ltr" : undefined}
            className="space-y-3"
          >
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-primary-foreground"
                >
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 pt-0.5 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {breathing && (
        <section
          aria-labelledby="breathing-title"
          className="flex gap-3 rounded-3xl border border-border bg-card p-5"
        >
          <WindIcon className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
          <div className="space-y-1">
            <h2 id="breathing-title" className="font-semibold">
              {t("breathingTitle")}
            </h2>
            <p className="leading-relaxed text-muted-foreground">{breathing}</p>
          </div>
        </section>
      )}

      {mistakes.length > 0 && (
        <section aria-labelledby="mistakes-title" className="space-y-3">
          <h2 id="mistakes-title" className="text-xl font-semibold">
            {t("mistakesTitle")}
          </h2>
          <ul className="space-y-2">
            {mistakes.map((mistake) => (
              <li key={mistake} className="flex gap-3">
                <CircleAlertIcon
                  className="mt-1 size-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="min-w-0 flex-1 leading-relaxed">{mistake}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {otherCautions.length > 0 && (
        <section
          aria-labelledby="caution-title"
          className="rounded-3xl border border-border bg-surface p-5"
        >
          <h2 id="caution-title" className="font-semibold">
            {t("cautionTitle")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t("cautionBody", { items: tagNames(otherCautions) })}
          </p>
        </section>
      )}
      {stats && profile && (
        <section aria-labelledby="stats-title" className="space-y-3">
          <h2 id="stats-title" className="text-xl font-semibold">
            {t("statsTitle")}
          </h2>
          <ExerciseStatsView stats={stats} unitSystem={profile.unitSystem} />
        </section>
      )}
    </article>
  );
}

function ExerciseSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-9 w-2/3 rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <Skeleton className="aspect-3/2 rounded-3xl" />
      <Skeleton className="h-80 rounded-3xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
