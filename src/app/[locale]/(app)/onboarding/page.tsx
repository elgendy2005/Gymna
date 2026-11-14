import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import type { DraftSource } from "@/components/onboarding/draft";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserProfile } from "@/server/queries/profile";
import { requireUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Onboarding");
  return { title: t("metaTitle") };
}

export default async function OnboardingPage() {
  const locale = await getLocale();

  return (
    <Suspense fallback={<WizardSkeleton />}>
      <Wizard locale={locale} />
    </Suspense>
  );
}

async function Wizard({ locale }: { locale: string }) {
  const user = await requireUser(locale);
  const profile = await getUserProfile(user.id);

  // Returning users edit their saved answers; only the fields the wizard
  // needs cross to the client.
  const initial: DraftSource | null = profile && {
    unitSystem: profile.unitSystem,
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    goal: profile.goal,
    level: profile.level,
    daysPerWeek: profile.daysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment,
    health: profile.health,
    notes: profile.notes,
  };

  // The key remounts the wizard with fresh values after each save.
  return <OnboardingWizard key={profile?.savedAt ?? "new"} initial={initial} />;
}

function WizardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6" aria-busy="true">
      <Skeleton className="h-1.5 rounded-full" />
      <Skeleton className="h-9 w-2/3 rounded-xl" />
      <Skeleton className="h-5 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}
