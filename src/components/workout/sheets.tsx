"use client";

import { Loader2Icon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { exerciseMediaUrl, FRAME_SIZE } from "@/lib/exercise-media";
import { formatWeight } from "@/lib/format";
import type { UnitSystem } from "@/lib/profile-options";
import { LIMITS } from "@/lib/validation/workout";
import { platesPerSide } from "@/lib/weight-engine";
import type { WorkoutExercise } from "@/lib/workout";

const sheetClass = "mx-auto max-h-[85dvh] max-w-3xl overflow-y-auto rounded-t-3xl p-5 pb-8";

type SheetProps = {
  exercise: WorkoutExercise;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Other exercises for the same slot. Everything listed is safe for this user. */
export function SwapSheet({
  exercise,
  name,
  open,
  onOpenChange,
  locale,
  inSession,
  onSwap,
}: SheetProps & {
  locale: string;
  /** Exercises already in this workout, which are not offered twice. */
  inSession: readonly string[];
  onSwap: (exerciseId: string) => Promise<boolean>;
}) {
  const t = useTranslations("Workout.swap");
  const e = useTranslations("Exercises.equipment");
  const [pending, setPending] = useState<string | null>(null);

  const locked = exercise.sets.some((set) => set.kind === "WORKING" && set.done);
  const options = exercise.alternatives.filter((option) => !inSession.includes(option.slug));

  const choose = async (exerciseId: string) => {
    setPending(exerciseId);
    const swapped = await onSwap(exerciseId);
    setPending(null);
    if (swapped) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(next) => pending === null && onOpenChange(next)}>
      <SheetContent side="bottom" className={sheetClass}>
        <SheetHeader className="p-0">
          <SheetTitle className="text-xl">{t("title", { name })}</SheetTitle>
          <SheetDescription>
            {locked ? t("locked") : options.length === 0 ? t("empty") : t("body")}
          </SheetDescription>
        </SheetHeader>
        {!locked && (
          <ul className="space-y-2">
            {options.map((option) => (
              <li key={option.exerciseId}>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void choose(option.exerciseId)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2 text-start outline-none transition-colors hover:border-input focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  <span className="block h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {option.thumb && (
                      <Image
                        src={exerciseMediaUrl(option.thumb)}
                        alt=""
                        width={FRAME_SIZE.width}
                        height={FRAME_SIZE.height}
                        unoptimized
                        className="size-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">
                      {(locale === "ar" && option.nameAr) || option.nameEn}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {e(option.equipment)}
                    </span>
                  </span>
                  {pending === option.exerciseId && (
                    <Loader2Icon className="me-2 size-5 animate-spin" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** The form guide: how to do the exercise, what to avoid and how to breathe. */
export function FormGuideSheet({ exercise, name, open, onOpenChange }: SheetProps) {
  const t = useTranslations("Workout.guide");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={sheetClass}>
        <SheetHeader className="p-0">
          <SheetTitle className="text-xl">{name}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 text-base">
          {exercise.cues.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">{t("cues")}</h3>
              <ol className="list-decimal space-y-1.5 ps-5 leading-relaxed">
                {exercise.cues.map((cue, index) => (
                  <li key={index}>{cue}</li>
                ))}
              </ol>
            </section>
          )}
          {exercise.mistakes.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">{t("mistakes")}</h3>
              <ul className="list-disc space-y-1.5 ps-5 leading-relaxed">
                {exercise.mistakes.map((mistake, index) => (
                  <li key={index}>{mistake}</li>
                ))}
              </ul>
            </section>
          )}
          {exercise.breathing && (
            <section className="space-y-2">
              <h3 className="font-semibold">{t("breathing")}</h3>
              <p className="leading-relaxed">{exercise.breathing}</p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Free-text notes for an exercise: seat height, grip, how it felt. */
export function NotesSheet({
  exercise,
  name,
  open,
  onOpenChange,
  onSave,
}: SheetProps & { onSave: (notes: string) => Promise<boolean> }) {
  const t = useTranslations("Workout.notes");
  const [text, setText] = useState(exercise.notes);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const saved = await onSave(text);
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <SheetContent side="bottom" className={sheetClass}>
        <SheetHeader className="p-0">
          <SheetTitle className="text-xl">{t("title")}</SheetTitle>
          <SheetDescription>{name}</SheetDescription>
        </SheetHeader>
        <textarea
          aria-label={t("title")}
          value={text}
          maxLength={LIMITS.notes.max}
          rows={4}
          placeholder={t("placeholder")}
          onChange={(event) => setText(event.target.value)}
          className="w-full rounded-2xl border border-input bg-background p-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <Button size="xl" className="w-full" disabled={saving} onClick={() => void save()}>
          {saving && <Loader2Icon className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

/** Which plates go on each side of the bar for a weight. */
export function PlateSheet({
  weightKg,
  barType,
  unitSystem,
  open,
  onOpenChange,
}: {
  weightKg: number;
  barType: "barbell" | "ez_bar";
  unitSystem: UnitSystem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Workout.plates");
  const c = useTranslations("Common");
  const units = { kg: c("kg"), lb: c("lb") };
  const plates = platesPerSide(weightKg, unitSystem, barType);
  const unit = units[plates.unit];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={sheetClass}>
        <SheetHeader className="p-0">
          <SheetTitle className="text-xl">
            {t("title", { weight: formatWeight(weightKg, unitSystem, units) })}
          </SheetTitle>
          <SheetDescription>{t("bar", { weight: `${plates.bar} ${unit}` })}</SheetDescription>
        </SheetHeader>
        {plates.belowBar ? (
          <p className="text-base">{t("belowBar")}</p>
        ) : plates.perSide.length === 0 ? (
          <p className="text-base">{t("barOnly")}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t("perSide")}</p>
            <ul className="flex flex-wrap items-center gap-2" dir="ltr">
              {plates.perSide.map((plate, index) => (
                <li
                  key={index}
                  className="grid h-14 min-w-12 place-items-center rounded-xl bg-brand px-3 text-lg font-bold text-primary-foreground tabular-nums"
                >
                  {plate}
                </li>
              ))}
              <li className="text-sm text-muted-foreground">{unit}</li>
            </ul>
          </div>
        )}
        {plates.leftover > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("leftover", { weight: `${plates.leftover} ${unit}` })}
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
