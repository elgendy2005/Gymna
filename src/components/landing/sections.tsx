import {
  ArrowRightIcon,
  ClipboardListIcon,
  DumbbellIcon,
  HeartPulseIcon,
  PlayCircleIcon,
  TimerIcon,
  TrendingUpIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/shared/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function SectionHeading({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <h2
        id={id}
        className="text-3xl font-bold tracking-tight text-balance sm:text-4xl"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-lg text-pretty text-muted-foreground">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

export async function Features() {
  const t = await getTranslations("Landing");

  const features = [
    { key: "plan", icon: ClipboardListIcon },
    { key: "safety", icon: HeartPulseIcon },
    { key: "demos", icon: PlayCircleIcon },
    { key: "session", icon: TimerIcon },
    { key: "weights", icon: DumbbellIcon },
    { key: "progress", icon: TrendingUpIcon },
  ] as const;

  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-24 px-4 py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="features-title"
          title={t("featuresTitle")}
          subtitle={t("featuresSubtitle")}
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon: Icon }, index) => (
            <li key={key}>
              <Reveal delay={(index % 3) * 0.08} className="h-full">
                <article className="group h-full rounded-3xl border border-border bg-card p-6 transition-colors duration-300 hover:border-brand/50">
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand/12 text-brand-text transition-colors duration-300 group-hover:bg-brand group-hover:text-primary-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {t(`features.${key}.body`)}
                  </p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function HowItWorks() {
  const t = await getTranslations("Landing");
  const steps = ["one", "two", "three"] as const;

  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-24 border-y border-border bg-surface px-4 py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id="how-title" title={t("howTitle")} />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step}>
              <Reveal delay={index * 0.1} className="h-full">
                <div className="h-full rounded-3xl border border-border bg-background p-6">
                  <span
                    className="text-5xl font-extrabold text-brand-text tabular-nums"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">
                    {t(`steps.${step}.title`)}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {t(`steps.${step}.body`)}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export async function FinalCta() {
  const t = await getTranslations("Landing");

  return (
    <section aria-labelledby="final-title" className="px-4 pb-20">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-brand/30 bg-card px-6 py-14 text-center">
        <div
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto size-96 rounded-full bg-brand/25 blur-[100px]"
          aria-hidden
        />
        <div className="relative">
          <h2
            id="final-title"
            className="text-3xl font-bold tracking-tight text-balance sm:text-5xl"
          >
            {t("finalTitle")}
          </h2>
          {/* Sits on the brand glow, where the muted grey misses 4.5:1. */}
          <p className="mt-4 text-lg text-foreground/80">{t("finalBody")}</p>
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "xl" }), "glow-brand mt-8")}
          >
            {t("finalCta")}
            <ArrowRightIcon className="rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
