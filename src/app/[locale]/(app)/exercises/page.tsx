import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ExerciseBrowser } from "@/components/exercise/exercise-browser";
import { Skeleton } from "@/components/ui/skeleton";
import { getExerciseIndex } from "@/server/queries/exercises";
import { requireUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Exercises");
  return { title: t("metaTitle") };
}

export default async function ExercisesPage() {
  const locale = await getLocale();
  const t = await getTranslations("Exercises");

  return (
    <div className="space-y-6 pb-10">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="leading-relaxed text-muted-foreground">{t("subtitle")}</p>
      </header>
      <Suspense fallback={<LibrarySkeleton />}>
        <Library locale={locale} />
      </Suspense>
    </div>
  );
}

async function Library({ locale }: { locale: string }) {
  await requireUser(locale);
  const exercises = await getExerciseIndex();
  return <ExerciseBrowser exercises={exercises} />;
}

function LibrarySkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-13 rounded-2xl" />
      <Skeleton className="h-10 rounded-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-4/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
