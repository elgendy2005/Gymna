import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HeroPreview } from "@/components/landing/hero-preview";
import { Reveal } from "@/components/shared/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function Hero() {
  const t = await getTranslations("Landing");

  const stats = [
    [t("stats.exercisesValue"), t("stats.exercises")],
    [t("stats.splitsValue"), t("stats.splits")],
    [t("stats.languagesValue"), t("stats.languages")],
  ] as const;

  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute start-1/2 top-[-18rem] size-[38rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px] rtl:translate-x-1/2"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24 lg:pb-24">
        <div className="flex flex-col items-start gap-6">
          <Reveal eager>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <SparklesIcon className="size-3.5 text-brand-text" aria-hidden />
              {t("badge")}
            </span>
          </Reveal>

          <Reveal eager delay={0.05}>
            <h1 className="text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {t("heroTitleA")}{" "}
              <span className="text-brand-text">{t("heroTitleB")}</span>
            </h1>
          </Reveal>

          <Reveal eager delay={0.1}>
            <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              {t("heroSubtitle")}
            </p>
          </Reveal>

          <Reveal eager delay={0.15} className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "xl" }), "glow-brand")}
            >
              {t("ctaPrimary")}
              <ArrowRightIcon className="rtl:rotate-180" aria-hidden />
            </Link>
            <a
              href="#how"
              className={buttonVariants({ variant: "outline", size: "xl" })}
            >
              {t("ctaSecondary")}
            </a>
          </Reveal>

          <Reveal eager delay={0.2}>
            <p className="text-sm text-muted-foreground">{t("heroNote")}</p>
          </Reveal>

          <Reveal eager delay={0.25} className="w-full">
            <dl className="grid w-full max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {stats.map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse gap-1">
                  <dt className="text-xs leading-snug text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="text-2xl font-bold tabular-nums sm:text-3xl" dir="ltr">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}
