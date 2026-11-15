import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SessionShell } from "@/components/workout/session-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserProfile } from "@/server/queries/profile";
import { requireUser } from "@/server/session";
import { getActiveWorkout } from "@/server/workout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Workout");
  return { title: t("metaTitle") };
}

export default async function WorkoutPage() {
  const locale = await getLocale();
  return (
    <Suspense fallback={<WorkoutSkeleton />}>
      <Workout locale={locale} />
    </Suspense>
  );
}

async function Workout({ locale }: { locale: string }) {
  const user = await requireUser(locale);
  const profile = await getUserProfile(user.id);
  if (!profile) redirect(`/${locale}/onboarding`);

  const view = await getActiveWorkout(user.id, profile, locale);
  // Nothing in progress: the workout starts from the Today page.
  if (!view) redirect(`/${locale}/today`);

  return <SessionShell view={view} locale={locale} />;
}

function WorkoutSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-20 rounded-2xl" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-20 rounded-3xl" />
      ))}
    </div>
  );
}
