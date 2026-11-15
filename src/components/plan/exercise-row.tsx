import { SparklesIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { exerciseMediaUrl, FRAME_SIZE } from "@/lib/exercise-media";
import { formatClock } from "@/lib/format";
import type { PlanExerciseView } from "@/server/queries/plan";

/** One planned exercise: thumbnail, name, sets × reps and rest. Links to its page. */
export function PlanExerciseRow({
  exercise,
  locale,
  children,
}: {
  exercise: PlanExerciseView;
  locale: string;
  /** Extra lines under the prescription, e.g. the suggested weight. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("Plan");
  const name = (locale === "ar" && exercise.nameAr) || exercise.nameEn;

  return (
    <Link
      href={`/exercises/${exercise.slug}`}
      className="flex items-center gap-3 rounded-2xl p-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        {exercise.thumb && (
          <Image
            src={exerciseMediaUrl(exercise.thumb)}
            alt=""
            width={FRAME_SIZE.width}
            height={FRAME_SIZE.height}
            unoptimized
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{name}</span>
          {exercise.focusExtra && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand-text">
              <SparklesIcon className="size-3" aria-hidden />
              {t("focusBadge")}
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          <bdi className="tabular-nums">
            {t(exercise.timed ? "setsSeconds" : "setsReps", {
              sets: exercise.sets,
              min: exercise.repMin,
              max: exercise.repMax,
            })}
          </bdi>
          {" · "}
          {t("rest", { time: formatClock(exercise.restSeconds) })}
        </p>
        {children}
      </div>
    </Link>
  );
}
