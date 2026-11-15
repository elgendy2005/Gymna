"use client";

import {
  ArrowLeftRightIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  DiscIcon,
  EllipsisVerticalIcon,
  NotebookPenIcon,
  PlusIcon,
  SkipForwardIcon,
  Undo2Icon,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ExerciseDemo } from "@/components/exercise/exercise-demo";
import { ReasonLine, SuggestionSummary } from "@/components/today/suggestion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exerciseMediaUrl, FRAME_SIZE } from "@/lib/exercise-media";
import { formatClock, formatWeight } from "@/lib/format";
import type { UnitSystem } from "@/lib/profile-options";
import { cn } from "@/lib/utils";
import { EFFORTS, type Effort, type SetAdjustment } from "@/lib/weight-engine";
import {
  exerciseProgress,
  isExerciseComplete,
  type WorkoutExercise,
  type WorkoutSet,
} from "@/lib/workout";
import { SetRow } from "./set-row";
import { FormGuideSheet, NotesSheet, PlateSheet, SwapSheet } from "./sheets";

/** Cues shown on the card itself; the rest are in the form guide sheet. */
const CUES_ON_CARD = 3;

function EffortPrompt({
  question,
  onAnswer,
}: {
  question: string;
  onAnswer: (effort: Effort) => void;
}) {
  const t = useTranslations("Workout.effort");
  return (
    <div className="space-y-2.5 rounded-2xl border border-brand/40 bg-brand/10 p-3">
      <p className="font-semibold">{question}</p>
      <div className="grid grid-cols-3 gap-2">
        {EFFORTS.map((effort) => (
          <Button
            key={effort}
            variant="outline"
            size="xl"
            className="px-2 text-sm"
            onClick={() => onAnswer(effort)}
          >
            {t(effort)}
          </Button>
        ))}
      </div>
    </div>
  );
}

export type ExerciseCardProps = {
  exercise: WorkoutExercise;
  index: number;
  locale: string;
  unitSystem: UnitSystem;
  open: boolean;
  /** The coach's latest in-session change for this exercise, if any. */
  adjustment: SetAdjustment | null;
  /** Name of the exercise that follows, shown once this one is done. */
  nextName: string | null;
  inSession: readonly string[];
  onToggle: () => void;
  onSet: (setId: string, patch: Partial<WorkoutSet>) => void;
  onCalibrate: (effort: Effort) => void;
  onFeedback: (effort: Effort) => void;
  onAddSet: () => void;
  onSkip: (skipped: boolean) => void;
  onSwap: (exerciseId: string) => Promise<boolean>;
  onSaveNotes: (notes: string) => Promise<boolean>;
};

/** One exercise of the workout: a header that is always visible and a body that opens. */
export function ExerciseCard(props: ExerciseCardProps) {
  const { exercise, locale, unitSystem, open } = props;
  const t = useTranslations("Workout");
  const p = useTranslations("Plan");
  const x = useTranslations("Exercises");
  const c = useTranslations("Common");
  const [sheet, setSheet] = useState<"swap" | "guide" | "notes" | "plates" | null>(null);

  const name = (locale === "ar" && exercise.nameAr) || exercise.nameEn;
  const units = { kg: c("kg"), lb: c("lb") };
  const progress = exerciseProgress(exercise);
  const complete = isExerciseComplete(exercise);
  const skipped = exercise.status === "SKIPPED";
  const bodyweight = exercise.loadType === "bodyweight";
  const hasBar = exercise.loadType === "barbell" || exercise.loadType === "ez_bar";

  const warmups = exercise.sets.filter((set) => set.kind === "WARMUP");
  const working = exercise.sets.filter((set) => set.kind === "WORKING");
  const nextSet = working.find((set) => !set.done) ?? working[working.length - 1];
  const firstDone = working.some((set) => set.done);

  const askCalibration =
    exercise.calibration && !bodyweight && firstDone && !complete && !exercise.calibrationEffort;
  const askFeedback = complete && !exercise.feedback && !skipped;

  /** A new weight on an open set carries down to the open sets after it. */
  const changeSet = (set: WorkoutSet, patch: Partial<WorkoutSet>) => {
    props.onSet(set.id, patch);
    if (patch.weightKg === undefined || set.done) return;
    for (const later of exercise.sets) {
      if (later.kind === set.kind && later.order > set.order && !later.done) {
        props.onSet(later.id, { weightKg: patch.weightKg });
      }
    }
  };

  const bodyId = `exercise-${exercise.id}`;

  return (
    <li
      className={cn(
        "rounded-3xl border bg-card transition-colors",
        open ? "border-brand/50" : "border-border",
        skipped && "opacity-60",
      )}
    >
      <div className="flex items-center gap-1 p-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={props.onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="relative block h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
            {exercise.thumb && (
              <Image
                src={exerciseMediaUrl(exercise.thumb)}
                alt=""
                width={FRAME_SIZE.width}
                height={FRAME_SIZE.height}
                unoptimized
                className="size-full object-cover"
              />
            )}
            {complete && (
              <span className="absolute inset-0 grid place-items-center bg-brand/80 text-primary-foreground">
                <CheckIcon className="size-7" strokeWidth={3} aria-hidden />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">{name}</span>
            <span className="block text-sm text-muted-foreground">
              {skipped ? t("skipped") : t("setsDone", progress)}
              {" · "}
              <bdi className="tabular-nums">
                {p(exercise.timed ? "setsSeconds" : "setsReps", {
                  sets: exercise.targetSets,
                  min: exercise.repMin,
                  max: exercise.repMax,
                })}
              </bdi>
            </span>
          </span>
          <ChevronDownIcon
            className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-xl" aria-label={t("menu.label", { name })} />}
          >
            <EllipsisVerticalIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem className="min-h-11 text-base" onClick={() => setSheet("guide")}>
              <BookOpenIcon aria-hidden />
              {t("menu.guide")}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 text-base" onClick={() => setSheet("swap")}>
              <ArrowLeftRightIcon aria-hidden />
              {t("menu.swap")}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 text-base" onClick={() => setSheet("notes")}>
              <NotebookPenIcon aria-hidden />
              {t("menu.notes")}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 text-base" onClick={() => props.onSkip(!skipped)}>
              {skipped ? <Undo2Icon aria-hidden /> : <SkipForwardIcon className="rtl:rotate-180" aria-hidden />}
              {t(skipped ? "menu.unskip" : "menu.skip")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open && (
        <div id={bodyId} className="space-y-4 px-3 pb-4">
          <ExerciseDemo
            media={exercise.media}
            alt={x("demoAlt", { name })}
            labels={{ play: x("play"), pause: x("pause"), empty: x("noDemo") }}
          />

          <ul aria-label={t("muscles")} className="flex flex-wrap gap-1.5">
            {exercise.primaryMuscles.map((muscle) => (
              <li
                key={muscle}
                className="rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand-text"
              >
                {x(`muscles.${muscle}`)}
              </li>
            ))}
            {exercise.secondaryMuscles.map((muscle) => (
              <li key={muscle} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {x(`muscles.${muscle}`)}
              </li>
            ))}
          </ul>

          {exercise.cues.length > 0 && (
            <ol className="list-decimal space-y-1 ps-5 text-sm leading-relaxed text-muted-foreground">
              {exercise.cues.slice(0, CUES_ON_CARD).map((cue, index) => (
                <li key={index}>{cue}</li>
              ))}
            </ol>
          )}

          <div className="space-y-1 rounded-2xl bg-muted/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <SuggestionSummary
                weightKg={exercise.suggestedWeightKg}
                lastTime={exercise.lastTime}
                timed={exercise.timed}
                unitSystem={unitSystem}
              />
              {hasBar && nextSet?.weightKg != null && (
                <Button variant="outline" size="lg" onClick={() => setSheet("plates")}>
                  <DiscIcon aria-hidden />
                  {t("plates.button")}
                </Button>
              )}
            </div>
            <ReasonLine
              reason={exercise.reason}
              variant={exercise.variant}
              timed={exercise.timed}
              unitSystem={unitSystem}
              className="text-sm leading-snug text-muted-foreground"
            />
            {exercise.loadType === "dumbbell" && (
              <p className="text-xs text-muted-foreground">{t("perDumbbell")}</p>
            )}
            {exercise.notes && (
              <p className="border-t border-border pt-2 text-sm">
                <NotebookPenIcon className="me-1.5 inline size-3.5" aria-hidden />
                {exercise.notes}
              </p>
            )}
          </div>

          <div>
            <div
              aria-hidden
              className="grid grid-cols-[2.25rem_1fr_1fr_3rem] gap-2 px-1.5 pb-1 text-center text-xs font-medium text-muted-foreground"
            >
              <span>{t("columns.set")}</span>
              <span>{bodyweight ? "" : units[unitSystem === "IMPERIAL" ? "lb" : "kg"]}</span>
              <span>{t(exercise.timed ? "columns.seconds" : "columns.reps")}</span>
              <span />
            </div>
            <ol className="space-y-1">
              {warmups.map((set, index) => (
                <SetRow
                  key={set.id}
                  set={set}
                  number={index + 1}
                  timed={exercise.timed}
                  bodyweight={bodyweight}
                  unitSystem={unitSystem}
                  onChange={(patch) => changeSet(set, patch)}
                />
              ))}
              {working.map((set, index) => (
                <SetRow
                  key={set.id}
                  set={set}
                  number={index + 1}
                  timed={exercise.timed}
                  bodyweight={bodyweight}
                  unitSystem={unitSystem}
                  onChange={(patch) => changeSet(set, patch)}
                />
              ))}
            </ol>
            <Button variant="ghost" size="xl" className="mt-1 w-full" onClick={props.onAddSet}>
              <PlusIcon aria-hidden />
              {t("addSet")}
            </Button>
          </div>

          {props.adjustment && (
            <p role="status" className="rounded-2xl bg-muted p-3 text-sm font-medium">
              {t(`adjusted.${props.adjustment.code}`, {
                weight: formatWeight(props.adjustment.weightKg, unitSystem, units),
              })}
            </p>
          )}

          {askCalibration && (
            <EffortPrompt question={t("calibrationQuestion")} onAnswer={props.onCalibrate} />
          )}
          {askFeedback && <EffortPrompt question={t("feedbackQuestion")} onAnswer={props.onFeedback} />}

          {complete && exercise.feedback && (
            <p className="text-center text-sm font-medium text-muted-foreground">
              {props.nextName ? t("nextUp", { name: props.nextName }) : t("allDone")}
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {t("restLine", { time: formatClock(exercise.restSeconds) })}
          </p>
        </div>
      )}

      <SwapSheet
        exercise={exercise}
        name={name}
        locale={locale}
        inSession={props.inSession}
        open={sheet === "swap"}
        onOpenChange={(next) => setSheet(next ? "swap" : null)}
        onSwap={props.onSwap}
      />
      <FormGuideSheet
        exercise={exercise}
        name={name}
        open={sheet === "guide"}
        onOpenChange={(next) => setSheet(next ? "guide" : null)}
      />
      {/* The key resets the draft to the saved notes each time it opens. */}
      <NotesSheet
        key={`${exercise.notes}:${sheet === "notes"}`}
        exercise={exercise}
        name={name}
        open={sheet === "notes"}
        onOpenChange={(next) => setSheet(next ? "notes" : null)}
        onSave={props.onSaveNotes}
      />
      {hasBar && nextSet?.weightKg != null && (
        <PlateSheet
          weightKg={nextSet.weightKg}
          barType={exercise.loadType === "ez_bar" ? "ez_bar" : "barbell"}
          unitSystem={unitSystem}
          open={sheet === "plates"}
          onOpenChange={(next) => setSheet(next ? "plates" : null)}
        />
      )}
    </li>
  );
}
