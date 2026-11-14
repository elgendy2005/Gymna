"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { bmiCategory, bmiGaugePercent, calculateBmi } from "@/lib/bmi";
import { cn } from "@/lib/utils";

// Share of the 15–40 gauge taken by each band: <18.5, <25, <30, 30+.
const BANDS = [
  { width: 14, className: "bg-chart-2" },
  { width: 26, className: "bg-brand" },
  { width: 20, className: "bg-chart-3" },
  { width: 40, className: "bg-destructive" },
] as const;

export function BmiCard({
  heightCm,
  weightKg,
  className,
}: {
  heightCm: number | null;
  weightKg: number | null;
  className?: string;
}) {
  const t = useTranslations("Onboarding.bmi");
  const bmi =
    heightCm !== null && weightKg !== null
      ? calculateBmi(weightKg, heightCm)
      : null;
  // Ignore values typed halfway, such as a height of "1".
  const plausible = bmi !== null && bmi >= 10 && bmi <= 70 ? bmi : null;

  return (
    <section
      aria-live="polite"
      className={cn("rounded-2xl border border-border bg-card p-4", className)}
    >
      <h3 className="text-sm font-medium text-muted-foreground">{t("title")}</h3>

      {plausible === null ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-4xl font-extrabold tabular-nums" dir="ltr">
              {plausible.toFixed(1)}
            </span>
            <span className="font-semibold">{t(bmiCategory(plausible))}</span>
          </p>

          {/* The gauge always runs low to high, left to right. */}
          <div
            dir="ltr"
            role="img"
            aria-label={t("scaleLabel", { value: plausible.toFixed(1) })}
            className="relative mt-4 pt-3"
          >
            <motion.span
              className="absolute top-0 -ms-1.5 size-0 border-x-6 border-t-8 border-x-transparent border-t-foreground"
              initial={false}
              animate={{ left: `${bmiGaugePercent(plausible)}%` }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            />
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {BANDS.map((band) => (
                <span
                  key={band.className}
                  className={band.className}
                  style={{ width: `${band.width}%` }}
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t("note")}
          </p>
        </>
      )}
    </section>
  );
}
