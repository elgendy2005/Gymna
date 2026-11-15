import { useTranslations } from "next-intl";
import { formatWeight } from "@/lib/format";
import type { UnitSystem } from "@/lib/profile-options";
import type { Reason } from "@/lib/weight-engine";

/** The coach's one-line reason for a suggested weight. */
export function ReasonLine({
  reason,
  variant,
  timed,
  unitSystem,
  className,
}: {
  reason: Reason;
  /** Which of the wordings to use. */
  variant: number;
  /** True when the exercise counts seconds, not reps. */
  timed: boolean;
  unitSystem: UnitSystem;
  className?: string;
}) {
  const t = useTranslations("Coach");
  const c = useTranslations("Common");
  const units = { kg: c("kg"), lb: c("lb") };
  const weight = (kg: number | undefined) =>
    kg === undefined ? "" : formatWeight(kg, unitSystem, units);

  return (
    <p className={className}>
      {t(`reasons.${reason.code}.${variant}` as never, {
        from: weight(reason.fromKg),
        to: weight(reason.toKg),
        target: t(timed ? "targetSeconds" : "targetReps", { count: reason.reps ?? 0 }),
      } as never)}
    </p>
  );
}

/** "Suggested 42.5 kg · Last time 40 kg × 10, 10, 9". */
export function SuggestionSummary({
  weightKg,
  lastTime,
  timed,
  unitSystem,
}: {
  weightKg: number | null;
  lastTime: { weightKg: number | null; reps: number[] } | null;
  timed: boolean;
  unitSystem: UnitSystem;
}) {
  const t = useTranslations("Today");
  const c = useTranslations("Common");
  const units = { kg: c("kg"), lb: c("lb") };

  const reps = lastTime?.reps.join(", ") ?? "";
  const last = !lastTime
    ? null
    : lastTime.weightKg === null
      ? t(timed ? "lastTimeSeconds" : "lastTimeReps", { reps })
      : t("lastTime", { weight: formatWeight(lastTime.weightKg, unitSystem, units), reps });

  return (
    <p className="text-sm">
      <span className="font-semibold text-brand-text">
        {weightKg === null
          ? t("bodyweight")
          : t("suggested", { weight: formatWeight(weightKg, unitSystem, units) })}
      </span>
      {last && <span className="text-muted-foreground"> · {last}</span>}
    </p>
  );
}
