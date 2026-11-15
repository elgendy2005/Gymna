import { CheckIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WeekDay } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/** The week from Saturday to Friday: which days are workouts, done, missed or rest. */
export function WeekStrip({ week }: { week: WeekDay[] }) {
  const t = useTranslations("Today");
  const w = useTranslations("Common.weekdays");

  return (
    <ol aria-label={t("weekLabel")} className="grid grid-cols-7 gap-1.5">
      {week.map((day) => {
        const state = day.done ? "done" : day.missed ? "missed" : day.training ? "training" : "rest";
        return (
          <li
            key={day.date}
            aria-current={day.isToday ? "date" : undefined}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border py-2.5 text-xs font-medium",
              day.isToday ? "border-brand bg-brand/10" : "border-transparent",
            )}
          >
            <span className={day.isToday ? "text-foreground" : "text-muted-foreground"}>
              {w(`short.${day.weekday}` as never)}
            </span>
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                state === "done" && "bg-brand text-primary-foreground",
                state === "missed" && "bg-destructive/15 text-destructive",
                state === "training" && "border-2 border-brand/60",
                state === "rest" && "border border-dashed border-border",
              )}
            >
              {state === "done" && <CheckIcon className="size-4" aria-hidden />}
              {state === "missed" && <XIcon className="size-4" aria-hidden />}
              {state === "training" && <span className="size-1.5 rounded-full bg-brand" aria-hidden />}
            </span>
            <span className="sr-only">
              {w(`long.${day.weekday}` as never)}: {t(`dayState.${state}`)}
              {day.isToday ? `, ${t("dayState.today")}` : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
