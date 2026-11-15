"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { formatClock } from "@/lib/format";
import type { SetAdjustment } from "@/lib/weight-engine";
import { nextOpenExercise, sessionProgress, type WorkoutView } from "@/lib/workout";
import { ExerciseCard } from "./exercise-card";
import { RestTimerBar, buzz, useRestTimer } from "./rest-timer";
import { useWorkout, type WorkoutEvent } from "./use-workout";

/** Seconds since the workout started, ticking once a second. */
function useElapsed(startedAt: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now === null ? 0 : Math.max(0, (now - new Date(startedAt).getTime()) / 1000);
}

/** The guided workout: top bar, one card per exercise and the rest timer. */
export function SessionShell({ view, locale }: { view: WorkoutView; locale: string }) {
  const t = useTranslations("Workout");
  const p = useTranslations("Plan");
  const router = useRouter();
  const timer = useRestTimer(view.id);
  const elapsed = useElapsed(view.startedAt);
  const [adjustments, setAdjustments] = useState<Record<string, SetAdjustment>>({});
  const [confirming, setConfirming] = useState(false);

  const notify = useCallback(
    (event: WorkoutEvent) => {
      switch (event.type) {
        case "error":
          toast.error(t(`errors.${event.code}`));
          break;
        case "pr":
          buzz([60, 40, 60, 40, 120]);
          toast.success(t("prToast"));
          break;
        case "adjusted":
          setAdjustments((current) => ({ ...current, [event.exerciseId]: event.adjustment }));
          break;
        case "set_done":
          buzz(40);
          if (event.kind === "WORKING") timer.start(event.restSeconds);
          break;
        case "swapped":
          setAdjustments((current) => {
            const next = { ...current };
            delete next[event.exercise.id];
            return next;
          });
          break;
      }
    },
    [t, timer],
  );

  const workout = useWorkout(view, locale, notify);
  const progress = sessionProgress(workout.exercises);
  const inSession = workout.exercises.map((exercise) => exercise.slug);
  const nameOf = (exercise: { nameAr: string | null; nameEn: string }) =>
    (locale === "ar" && exercise.nameAr) || exercise.nameEn;

  const finish = async () => {
    const completed = await workout.finish();
    if (completed === null) return;
    timer.skip();
    if (completed) router.replace("/today");
    else {
      toast(t("abandoned"));
      router.replace("/today");
    }
  };

  const unchecked = progress.total - progress.done;

  return (
    <div className="space-y-4 pb-28">
      <header className="sticky top-[4.75rem] z-30 -mx-1 space-y-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{p(`dayTypes.${view.dayType}`)}</h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              <bdi>{formatClock(elapsed)}</bdi>
              {" · "}
              {t("progress", progress)}
            </p>
          </div>
          <Button
            size="xl"
            disabled={workout.finishing}
            onClick={() => (unchecked > 0 ? setConfirming(true) : void finish())}
          >
            {workout.finishing && <Loader2Icon className="animate-spin" aria-hidden />}
            {t("finish")}
          </Button>
        </div>
        <div
          role="progressbar"
          aria-label={t("progressLabel")}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
          />
        </div>
      </header>

      {view.needsClearance && (
        <p className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          {t("cautious")}
        </p>
      )}

      <ol className="space-y-3">
        {workout.exercises.map((exercise, index) => {
          const next = nextOpenExercise(workout.exercises, exercise.id);
          return (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              locale={locale}
              unitSystem={view.unitSystem}
              open={workout.openId === exercise.id}
              adjustment={adjustments[exercise.id] ?? null}
              nextName={next && next.id !== exercise.id ? nameOf(next) : null}
              inSession={inSession}
              onToggle={() => workout.open(workout.openId === exercise.id ? null : exercise.id)}
              onSet={(setId, patch) => void workout.saveSet(exercise.id, setId, patch)}
              onCalibrate={(effort) => void workout.calibrate(exercise.id, effort)}
              onFeedback={(effort) => void workout.giveFeedback(exercise.id, effort)}
              onAddSet={() => void workout.addSet(exercise.id)}
              onSkip={(skipped) => void workout.skip(exercise.id, skipped)}
              onSwap={(exerciseId) => workout.swap(exercise.id, exerciseId)}
              onSaveNotes={(notes) => workout.saveNotes(exercise.id, notes)}
            />
          );
        })}
      </ol>

      <RestTimerBar timer={timer} />

      <Dialog open={confirming} onOpenChange={(next) => !workout.finishing && setConfirming(next)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>
              {progress.done === 0 ? t("confirmEmpty") : t("confirmBody", { count: unchecked })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="xl" onClick={() => setConfirming(false)}>
              {t("keepGoing")}
            </Button>
            <Button
              size="xl"
              disabled={workout.finishing}
              onClick={() => void finish()}
            >
              {workout.finishing && <Loader2Icon className="animate-spin" aria-hidden />}
              {t("finishAnyway")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
