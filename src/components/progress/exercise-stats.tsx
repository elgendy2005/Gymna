import { TrophyIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { E1rmChart } from "@/components/progress/e1rm-chart";
import { formatWeight, weightValue } from "@/lib/format";
import type { UnitSystem } from "@/lib/profile-options";
import type { ExerciseStats } from "@/server/queries/stats";

/** History rows shown before the list is cut. */
const HISTORY_SHOWN = 10;

/**
 * A user's numbers on one exercise: record cards, the estimated-max chart
 * and the workout-by-workout history.
 */
export async function ExerciseStatsView({
  stats,
  unitSystem,
}: {
  stats: ExerciseStats;
  unitSystem: UnitSystem;
}) {
  const t = await getTranslations("Progress");
  const c = await getTranslations("Common");
  const format = await getFormatter();
  const units = { kg: c("kg"), lb: c("lb") };
  const unit = unitSystem === "IMPERIAL" ? units.lb : units.kg;
  const weight = (kg: number) => formatWeight(Math.round(kg * 10) / 10, unitSystem, units);
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00Z`), { day: "numeric", month: "short" });

  const cards = [
    { label: t("bestE1rm"), value: stats.bestE1rmKg === null ? "–" : weight(stats.bestE1rmKg) },
    { label: t("maxWeight"), value: stats.maxWeightKg === null ? "–" : weight(stats.maxWeightKg) },
    {
      label: t("maxVolume"),
      value: stats.maxSessionVolumeKg ? weight(Math.round(stats.maxSessionVolumeKg)) : "–",
    },
  ];

  const points = stats.history.flatMap((point) =>
    point.e1rmKg === null
      ? []
      : [{ label: day(point.date), value: Math.round(weightValue(point.e1rmKg, unitSystem) * 10) / 10 }],
  );

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{card.label}</dt>
            <dd className="mt-1 font-bold tabular-nums">
              <bdi>{card.value}</bdi>
            </dd>
          </div>
        ))}
      </dl>

      {points.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t("chartTitle")}</h3>
          <E1rmChart points={points} unit={unit} title={t("chartTitle")} bestLabel={t("best")} />
          {points.length === 1 && <p className="mt-2 text-sm text-muted-foreground">{t("chartOnePoint")}</p>}
        </div>
      )}

      <div>
        <h3 className="mb-2 px-1 text-sm font-medium text-muted-foreground">
          {t("historyTitle", { count: stats.sessions })}
        </h3>
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card px-4">
          {[...stats.history]
            .reverse()
            .slice(0, HISTORY_SHOWN)
            .map((point) => (
              <li key={point.date + point.volumeKg} className="flex items-baseline gap-3 py-3">
                <span className="w-16 shrink-0 text-sm text-muted-foreground">{day(point.date)}</span>
                <span className="min-w-0 flex-1 text-sm tabular-nums">
                  <bdi dir="ltr">
                    {point.sets
                      .map((set) =>
                        set.weightKg === null
                          ? stats.timed
                            ? t("seconds", { count: set.reps })
                            : String(set.reps)
                          : `${weightValue(set.weightKg, unitSystem)} × ${set.reps}`,
                      )
                      .join("  ·  ")}
                    {point.sets.some((set) => set.weightKg !== null) ? ` ${unit}` : ""}
                  </bdi>
                </span>
                {point.sets.some((set) => set.isPr) && (
                  <TrophyIcon className="size-4 shrink-0 self-center text-warning" aria-label={t("record")} />
                )}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
