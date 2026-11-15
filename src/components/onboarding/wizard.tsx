"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Loader2Icon,
  PencilIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { z } from "zod";
import { BmiCard } from "@/components/onboarding/bmi-card";
import { ChoiceCards, ChoicePills } from "@/components/onboarding/choice";
import {
  draftFrom,
  draftHeightCm,
  draftLifts,
  draftWeightKg,
  emptyDraft,
  liftStarted,
  switchUnits,
  toInput,
  type Draft,
  type DraftSource,
} from "@/components/onboarding/draft";
import { FocusAreaGrid, TrainingDaysPicker } from "@/components/onboarding/focus-areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { calculateBmi } from "@/lib/bmi";
import { HEALTH_QUESTIONS } from "@/lib/health";
import {
  BASELINE_LIFTS,
  DAYS_PER_WEEK,
  defaultTrainingDays,
  EQUIPMENT,
  FOCUS_AREAS,
  GENDERS,
  GOALS,
  LEVELS,
  MAX_FOCUS_AREAS,
  SESSION_MINUTES,
  TRAINING_EXPERIENCE,
  UNIT_SYSTEMS,
  WEEKDAYS,
  type FocusArea,
} from "@/lib/profile-options";
import { cmToFeetInches, kgToLb, round } from "@/lib/units";
import { cn } from "@/lib/utils";
import {
  aboutSchema,
  focusSchema,
  goalSchema,
  healthSchema,
  levelSchema,
  liftsSchema,
  scheduleSchema,
  type OnboardingErrorCode,
} from "@/lib/validation/onboarding";
import { saveOnboardingAction } from "@/server/actions/onboarding";

const STEPS = [
  "about",
  "goal",
  "focus",
  "level",
  "lifts",
  "schedule",
  "health",
  "review",
] as const;
type Step = (typeof STEPS)[number];

/** The steps this user sees: someone who never lifted is not asked for weights. */
function stepsFor(draft: Draft): Step[] {
  return STEPS.filter((step) => step !== "lifts" || draft.experience !== "NEVER");
}

const STEP_SCHEMAS: Partial<Record<Step, z.ZodType>> = {
  about: aboutSchema,
  goal: goalSchema,
  focus: focusSchema,
  level: levelSchema,
  lifts: liftsSchema,
  schedule: scheduleSchema,
  health: healthSchema,
};

/** Field path → translation key under `Onboarding.errors`. */
type Errors = Record<string, string>;

const FIELD_CLASS = "h-12 rounded-xl px-3.5 text-base md:text-base";

function validateStep(step: Step, draft: Draft): Errors {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return {};
  const result = schema.safeParse(toInput(draft));
  if (result.success) return {};

  const errors: Errors = {};
  const lifts = draftLifts(draft);
  for (const issue of result.error.issues) {
    if (issue.path[0] === "health") {
      // Health answers share one message at the top of the list.
      errors.health ??= "healthRequired";
    } else if (issue.path[0] === "lifts" && typeof issue.path[1] === "number") {
      // Keyed by lift so the message sits under the right row.
      errors[`lifts.${lifts[issue.path[1]].lift}`] ??= issue.message;
    } else {
      errors[issue.path.join(".")] ??= issue.message;
    }
  }
  return errors;
}

export function OnboardingWizard({ initial }: { initial: DraftSource | null }) {
  const t = useTranslations("Onboarding");
  const w = useTranslations("Common.weekdays");
  const locale = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() =>
    initial ? draftFrom(initial) : emptyDraft(),
  );
  const [step, setStep] = useState<Step>("about");
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<OnboardingErrorCode | null>(null);
  const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const steps = stepsFor(draft);
  const stepIndex = steps.indexOf(step);
  const isLast = step === "review";
  const heightCm = draftHeightCm(draft);
  const weightKg = draftWeightKg(draft);

  // Move focus to the new step's heading so keyboard and screen reader
  // users land at the top of it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  // Next keeps this page's state alive after navigating away. Without a
  // reset, coming back to edit would show the review step still "saving".
  useLayoutEffect(() => {
    return () => {
      setStep("about");
      setDirection(1);
      setSaving(false);
      setErrors({});
      setSubmitError(null);
      setDraft((current) => ({ ...current, disclaimerAccepted: false }));
    };
  }, []);

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    // Clear the messages for the fields being corrected.
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      if ("heightFeet" in patch || "heightInches" in patch) delete next.heightCm;
      if ("weight" in patch) delete next.weightKg;
      if ("daysPerWeek" in patch) delete next.trainingDays;
      if ("lifts" in patch) {
        for (const key of Object.keys(next)) if (key.startsWith("lifts.")) delete next[key];
      }
      return next;
    });
  };

  const error = (key: string) => {
    const code = errors[key];
    if (!code) return null;
    // The limits are stored in cm and kg; say them in the units on screen.
    const imperial =
      draft.unitSystem === "IMPERIAL" && (code === "heightRange" || code === "weightRange");
    return t(`errors.${imperial ? `${code}Imperial` : code}` as never);
  };

  const goTo = (target: Step) => {
    setDirection(STEPS.indexOf(target) > STEPS.indexOf(step) ? 1 : -1);
    setErrors({});
    setSubmitError(null);
    setStep(target);
  };

  const next = () => {
    const found = validateStep(step, draft);
    setErrors(found);
    if (Object.keys(found).length === 0) goTo(steps[stepIndex + 1]);
  };

  const submit = async () => {
    // Re-check every step: the review page can be reached with stale data.
    for (const name of steps) {
      const found = validateStep(name, draft);
      if (Object.keys(found).length > 0) {
        goTo(name);
        setErrors(found);
        return;
      }
    }

    setSaving(true);
    setSubmitError(null);
    let result;
    try {
      result = await saveOnboardingAction({ ...toInput(draft), timezone: browserTimeZone() });
    } catch {
      result = { ok: false as const, error: "server_error" as const };
    }
    if (result.ok) {
      // Leave the button in its saving state while the next page loads.
      router.replace("/today");
      return;
    }
    setSaving(false);
    setSubmitError(result.error);
  };

  const options = <T extends string>(values: readonly T[], group: string) =>
    values.map((value) => ({
      value,
      title: t(`${group}.${value}.title` as never),
      body: t(`${group}.${value}.body` as never),
    }));

  const slide = locale === "ar" ? -direction : direction;
  const comma = locale === "ar" ? "، " : ", ";
  const focusLabels = Object.fromEntries(
    FOCUS_AREAS.map((area) => [area, t(`focus.areas.${area}`)]),
  ) as Record<FocusArea, string>;
  const flagged = HEALTH_QUESTIONS.filter(
    (q) => draft.health[q] && (q !== "pregnancy" || draft.gender === "FEMALE"),
  );
  const questions = HEALTH_QUESTIONS.filter(
    (q) => q !== "pregnancy" || draft.gender === "FEMALE",
  );

  const titles: Record<Step, [string, string]> = {
    about: [t("about.title"), t("about.subtitle")],
    goal: [t("goal.title"), t("goal.subtitle")],
    focus: [t("focus.title"), t("focus.subtitle")],
    level: [t("level.title"), t("level.subtitle")],
    lifts: [t("lifts.title"), t("lifts.subtitle")],
    schedule: [t("schedule.title"), t("schedule.subtitle")],
    health: [t("health.title"), t("health.subtitle")],
    review: [t("review.title"), t("review.subtitle")],
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-brand-text">
            {t(`steps.${step}`)}
          </span>
          <span className="text-muted-foreground">
            {t("stepOf", { current: stepIndex + 1, total: steps.length })}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progressLabel")}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={stepIndex + 1}
          aria-valuetext={t("stepOf", {
            current: stepIndex + 1,
            total: steps.length,
          })}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            className="h-full origin-left rounded-full bg-brand rtl:origin-right"
            initial={false}
            animate={{ scaleX: (stepIndex + 1) / steps.length }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={slide}>
        <motion.div
          key={step}
          custom={slide}
          initial={{ opacity: 0, x: slide * 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: slide * -32 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex-1"
        >
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-balance outline-none sm:text-3xl"
          >
            {titles[step][0]}
          </h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            {titles[step][1]}
          </p>

          <div className="mt-6 space-y-6">
            {step === "about" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">{t("about.age")}</Label>
                    <Input
                      id="age"
                      inputMode="numeric"
                      autoComplete="off"
                      dir="ltr"
                      className={`${FIELD_CLASS} rtl:text-right`}
                      value={draft.age}
                      onChange={(e) => update({ age: e.target.value })}
                      aria-invalid={Boolean(errors.age)}
                      aria-describedby={errors.age ? "age-error" : undefined}
                    />
                    {errors.age && (
                      <p id="age-error" role="alert" className="text-sm text-destructive">
                        {error("age")}
                      </p>
                    )}
                  </div>
                  <ChoicePills
                    legend={t("about.gender")}
                    options={GENDERS.map((value) => ({
                      value,
                      title: t(`about.${value}`),
                    }))}
                    value={draft.gender}
                    onChange={(gender) => update({ gender })}
                    error={error("gender")}
                  />
                </div>

                <ChoicePills
                  legend={t("about.units")}
                  size="sm"
                  options={UNIT_SYSTEMS.map((value) => ({
                    value,
                    title: `${t(`about.${value}`)} (${
                      value === "METRIC"
                        ? `${t("about.cm")} · ${t("about.kg")}`
                        : `${t("about.ft")} · ${t("about.lb")}`
                    })`,
                  }))}
                  value={draft.unitSystem}
                  onChange={(unitSystem) =>
                    setDraft((current) => switchUnits(current, unitSystem))
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  {draft.unitSystem === "METRIC" ? (
                    <MeasureField
                      id="height"
                      label={t("about.height")}
                      unit={t("about.cm")}
                      value={draft.heightCm}
                      onChange={(heightCm) => update({ heightCm })}
                      error={error("heightCm")}
                    />
                  ) : (
                    <fieldset
                      aria-describedby={errors.heightCm ? "height-error" : undefined}
                    >
                      <legend className="mb-2 text-sm font-medium">
                        {t("about.height")}
                      </legend>
                      <div className="grid grid-cols-2 gap-2">
                        <UnitInput
                          ariaLabel={t("about.feetLabel")}
                          unit={t("about.ft")}
                          value={draft.heightFeet}
                          onChange={(heightFeet) => update({ heightFeet })}
                          invalid={Boolean(errors.heightCm)}
                        />
                        <UnitInput
                          ariaLabel={t("about.inchesLabel")}
                          unit={t("about.in")}
                          value={draft.heightInches}
                          onChange={(heightInches) => update({ heightInches })}
                          invalid={Boolean(errors.heightCm)}
                        />
                      </div>
                      {errors.heightCm && (
                        <p id="height-error" role="alert" className="mt-2 text-sm text-destructive">
                          {error("heightCm")}
                        </p>
                      )}
                    </fieldset>
                  )}
                  <MeasureField
                    id="weight"
                    label={t("about.weight")}
                    unit={draft.unitSystem === "METRIC" ? t("about.kg") : t("about.lb")}
                    value={draft.weight}
                    onChange={(weight) => update({ weight })}
                    error={error("weightKg")}
                  />
                </div>

                <BmiCard heightCm={heightCm} weightKg={weightKg} />
              </>
            )}

            {step === "goal" && (
              <ChoiceCards
                legend={t("steps.goal")}
                hideLegend
                options={options(GOALS, "goal")}
                value={draft.goal}
                onChange={(goal) => update({ goal })}
                error={error("goal")}
              />
            )}

            {step === "focus" && (
              <FocusAreaGrid
                legend={t("steps.focus")}
                hideLegend
                hint={t("focus.hint", { max: MAX_FOCUS_AREAS })}
                labels={focusLabels}
                value={draft.focusAreas}
                onChange={(focusAreas) => update({ focusAreas })}
                error={error("focusAreas")}
              />
            )}

            {step === "level" && (
              <>
                <ChoiceCards
                  legend={t("steps.level")}
                  hideLegend
                  options={options(LEVELS, "level")}
                  value={draft.level}
                  onChange={(level) => update({ level })}
                  error={error("level")}
                />
                <ChoiceCards
                  legend={t("experience.question")}
                  options={TRAINING_EXPERIENCE.map((value) => ({
                    value,
                    title: t(`experience.${value}`),
                  }))}
                  value={draft.experience}
                  onChange={(experience) => update({ experience })}
                  error={error("experience")}
                />
              </>
            )}

            {step === "lifts" && (
              <>
                <ul className="space-y-3">
                  {BASELINE_LIFTS.map((lift) => {
                    const entry = draft.lifts[lift];
                    const message = error(`lifts.${lift}`);
                    const setEntry = (patch: Partial<typeof entry>) =>
                      update({ lifts: { ...draft.lifts, [lift]: { ...entry, ...patch } } });
                    return (
                      <li key={lift}>
                        <fieldset
                          className={cn(
                            "rounded-2xl border bg-card p-4",
                            message ? "border-destructive/60" : "border-border",
                          )}
                          aria-describedby={message ? `${lift}-error` : undefined}
                        >
                          <legend className="sr-only">{t(`lifts.names.${lift}`)}</legend>
                          <p aria-hidden className="mb-3 font-semibold">
                            {t(`lifts.names.${lift}`)}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <UnitInput
                              ariaLabel={t("lifts.weightLabel")}
                              unit={draft.unitSystem === "METRIC" ? t("about.kg") : t("about.lb")}
                              value={entry.weight}
                              onChange={(weight) => setEntry({ weight })}
                              invalid={Boolean(message)}
                            />
                            <UnitInput
                              ariaLabel={t("lifts.repsLabel")}
                              unit={t("lifts.repsUnit")}
                              value={entry.reps}
                              onChange={(reps) => setEntry({ reps })}
                              invalid={Boolean(message)}
                              inputMode="numeric"
                            />
                          </div>
                          {message && (
                            <p
                              id={`${lift}-error`}
                              role="alert"
                              className="mt-2 text-sm text-destructive"
                            >
                              {message}
                            </p>
                          )}
                        </fieldset>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-sm leading-relaxed text-muted-foreground">{t("lifts.note")}</p>
              </>
            )}

            {step === "schedule" && (
              <>
                <ChoicePills
                  legend={t("schedule.days")}
                  options={DAYS_PER_WEEK.map((value) => ({
                    value,
                    title: String(value),
                  }))}
                  value={draft.daysPerWeek}
                  onChange={(daysPerWeek) =>
                    update({ daysPerWeek, trainingDays: defaultTrainingDays(daysPerWeek) })
                  }
                  error={error("daysPerWeek")}
                />
                <TrainingDaysPicker
                  legend={t("schedule.whichDays")}
                  hint={t("schedule.whichDaysHint", { count: draft.daysPerWeek ?? 0 })}
                  labels={WEEKDAYS.map((day) => w(`short.${day}`))}
                  names={WEEKDAYS.map((day) => w(`long.${day}`))}
                  count={draft.daysPerWeek ?? 0}
                  value={draft.trainingDays}
                  onChange={(trainingDays) => update({ trainingDays })}
                  error={error("trainingDays")}
                />
                <ChoicePills
                  legend={t("schedule.session")}
                  size="sm"
                  options={SESSION_MINUTES.map((value) => ({
                    value,
                    title: t("schedule.minutes", { count: value }),
                  }))}
                  value={draft.sessionMinutes}
                  onChange={(sessionMinutes) => update({ sessionMinutes })}
                  error={error("sessionMinutes")}
                />
                <ChoiceCards
                  legend={t("schedule.equipment")}
                  options={options(EQUIPMENT, "schedule")}
                  value={draft.equipment}
                  onChange={(equipment) => update({ equipment })}
                  error={error("equipment")}
                />
              </>
            )}

            {step === "health" && (
              <>
                {errors.health && (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
                  >
                    {error("health")}
                  </p>
                )}
                <ul className="space-y-3">
                  {questions.map((question) => (
                    <li key={question}>
                      <YesNo
                        question={t(`health.questions.${question}`)}
                        yes={t("health.yes")}
                        no={t("health.no")}
                        value={draft.health[question]}
                        missing={Boolean(errors.health) && draft.health[question] === null}
                        onChange={(answer) => {
                          setDraft((current) => ({
                            ...current,
                            health: { ...current.health, [question]: answer },
                          }));
                        }}
                      />
                    </li>
                  ))}
                </ul>

                <AnimatePresence initial={false}>
                  {flagged.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <ClearanceNotice
                        title={t("health.noticeTitle")}
                        body={t("health.noticeBody")}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("health.notesLabel")}</Label>
                  <textarea
                    id="notes"
                    rows={3}
                    maxLength={500}
                    placeholder={t("health.notesPlaceholder")}
                    value={draft.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    aria-invalid={Boolean(errors.notes)}
                    className="w-full rounded-xl border border-input bg-transparent px-3.5 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  />
                  {errors.notes && (
                    <p role="alert" className="text-sm text-destructive">
                      {error("notes")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 shrink-0 accent-(--brand)"
                      checked={draft.disclaimerAccepted}
                      onChange={(e) => update({ disclaimerAccepted: e.target.checked })}
                      aria-invalid={Boolean(errors.disclaimerAccepted)}
                      aria-describedby={
                        errors.disclaimerAccepted ? "disclaimer-error" : undefined
                      }
                    />
                    <span className="text-sm leading-relaxed">
                      {t("health.disclaimerLabel")}
                    </span>
                  </label>
                  {errors.disclaimerAccepted && (
                    <p id="disclaimer-error" role="alert" className="mt-2 text-sm text-destructive">
                      {error("disclaimerAccepted")}
                    </p>
                  )}
                </div>
              </>
            )}

            {step === "review" && (
              <>
                <ReviewSection
                  title={t("steps.about")}
                  editLabel={`${t("edit")}: ${t("steps.about")}`}
                  onEdit={() => goTo("about")}
                  rows={[
                    [t("review.age"), t("values.years", { age: draft.age })],
                    [t("review.gender"), draft.gender ? t(`about.${draft.gender}`) : ""],
                    [t("review.height"), formatHeight(t, draft, heightCm)],
                    [t("review.weight"), formatWeight(t, draft, weightKg)],
                    [
                      t("review.bmi"),
                      heightCm && weightKg
                        ? (calculateBmi(weightKg, heightCm)?.toFixed(1) ?? "")
                        : "",
                    ],
                  ]}
                />
                <ReviewSection
                  title={t("steps.goal")}
                  editLabel={`${t("edit")}: ${t("steps.goal")}`}
                  onEdit={() => goTo("goal")}
                  rows={[
                    [t("review.goal"), draft.goal ? t(`goal.${draft.goal}.title`) : ""],
                    [
                      t("review.focus"),
                      draft.focusAreas.length === 0
                        ? t("review.focusNone")
                        : draft.focusAreas.map((area) => focusLabels[area]).join(comma),
                    ],
                  ]}
                />
                <ReviewSection
                  title={t("steps.level")}
                  editLabel={`${t("edit")}: ${t("steps.level")}`}
                  onEdit={() => goTo("level")}
                  rows={[
                    [t("review.level"), draft.level ? t(`level.${draft.level}.title`) : ""],
                    [
                      t("review.experience"),
                      draft.experience ? t(`experience.${draft.experience}`) : "",
                    ],
                    ...(draft.experience === "NEVER"
                      ? []
                      : BASELINE_LIFTS.filter((lift) => liftStarted(draft.lifts[lift])).map(
                          (lift): [string, string] => [
                            t(`lifts.names.${lift}`),
                            t("values.lift", {
                              weight: draft.lifts[lift].weight,
                              unit: draft.unitSystem === "METRIC" ? t("about.kg") : t("about.lb"),
                              reps: draft.lifts[lift].reps,
                            }),
                          ],
                        )),
                  ]}
                />
                <ReviewSection
                  title={t("steps.schedule")}
                  editLabel={`${t("edit")}: ${t("steps.schedule")}`}
                  onEdit={() => goTo("schedule")}
                  rows={[
                    [
                      t("review.days"),
                      draft.trainingDays.map((day) => w(`long.${day}`)).join(comma),
                    ],
                    [t("review.session"), t("schedule.minutes", { count: draft.sessionMinutes ?? 0 })],
                    [
                      t("review.equipment"),
                      draft.equipment ? t(`schedule.${draft.equipment}.title`) : "",
                    ],
                  ]}
                />
                <ReviewSection
                  title={t("steps.health")}
                  editLabel={`${t("edit")}: ${t("steps.health")}`}
                  onEdit={() => goTo("health")}
                  rows={[
                    [
                      t("review.health"),
                      flagged.length === 0
                        ? t("review.healthNone")
                        : flagged.map((q) => t(`flagLabels.${q}`)).join(comma),
                    ],
                    ...(draft.notes.trim()
                      ? [[t("review.notes"), draft.notes.trim()] as [string, string]]
                      : []),
                  ]}
                />
                {flagged.length > 0 && (
                  <ClearanceNotice
                    title={t("health.noticeTitle")}
                    body={t("health.noticeBody")}
                  />
                )}
                {submitError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
                  >
                    {t(`errors.${submitError}`)}
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Actions stay within thumb reach at the bottom of the screen. */}
      <div className="sticky bottom-0 -mx-4 mt-8 flex gap-3 border-t border-border bg-background/90 px-4 py-4 backdrop-blur-md">
        {stepIndex > 0 && (
          <Button
            type="button"
            variant="outline"
            size="xl"
            onClick={() => goTo(steps[stepIndex - 1])}
            disabled={saving}
          >
            <ArrowLeftIcon className="rtl:rotate-180" aria-hidden />
            {t("back")}
          </Button>
        )}
        <Button
          type="button"
          size="xl"
          className="flex-1"
          onClick={isLast ? submit : next}
          disabled={saving}
        >
          {saving && <Loader2Icon className="animate-spin" aria-hidden />}
          {saving ? t("saving") : isLast ? t("finish") : t("next")}
          {!isLast && <ArrowRightIcon className="rtl:rotate-180" aria-hidden />}
        </Button>
      </div>
    </div>
  );
}

/** The browser's IANA zone, or undefined where it cannot tell. */
function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

type Translate = ReturnType<typeof useTranslations<"Onboarding">>;

function formatHeight(t: Translate, draft: Draft, heightCm: number | null) {
  if (heightCm === null) return "";
  if (draft.unitSystem === "METRIC") return t("values.cm", { value: round(heightCm) });
  return t("values.feetInches", cmToFeetInches(heightCm));
}

function formatWeight(t: Translate, draft: Draft, weightKg: number | null) {
  if (weightKg === null) return "";
  return draft.unitSystem === "METRIC"
    ? t("values.kg", { value: round(weightKg, 1) })
    : t("values.lb", { value: round(kgToLb(weightKg), 1) });
}

function UnitInput({
  id,
  ariaLabel,
  unit,
  value,
  onChange,
  invalid,
  describedBy,
  inputMode = "decimal",
}: {
  id?: string;
  ariaLabel?: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        aria-label={ariaLabel}
        inputMode={inputMode}
        autoComplete="off"
        dir="ltr"
        className={`${FIELD_CLASS} pe-12 rtl:ps-12 rtl:pe-3.5 rtl:text-right`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-sm text-muted-foreground"
      >
        {unit}
      </span>
    </div>
  );
}

function MeasureField({
  id,
  label,
  unit,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} <span className="sr-only">({unit})</span>
      </Label>
      <UnitInput
        id={id}
        unit={unit}
        value={value}
        onChange={onChange}
        invalid={Boolean(error)}
        describedBy={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function YesNo({
  question,
  yes,
  no,
  value,
  missing,
  onChange,
}: {
  question: string;
  yes: string;
  no: string;
  value: boolean | null;
  missing: boolean;
  onChange: (value: boolean) => void;
}) {
  const answers: [boolean, string][] = [
    [false, no],
    [true, yes],
  ];

  return (
    <fieldset
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card p-3.5 ps-4",
        missing ? "border-destructive/60" : "border-border",
      )}
    >
      <legend className="sr-only">{question}</legend>
      <span aria-hidden className="flex-1 text-sm leading-relaxed">
        {question}
      </span>
      <div className="flex shrink-0 gap-1.5">
        {answers.map(([answer, label]) => {
          const checked = value === answer;
          return (
            <label
              key={label}
              className={cn(
                "flex h-11 min-w-14 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked
                  ? answer
                    ? "border-warning bg-warning/15 text-warning"
                    : "border-brand bg-brand/15 text-brand-text"
                  : "border-border hover:border-input",
              )}
            >
              <input
                type="radio"
                name={question}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(answer)}
              />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ClearanceNotice({ title, body }: { title: string; body: string }) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4"
    >
      <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  editLabel,
  onEdit,
  rows,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  rows: [string, string][];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={editLabel}
          onClick={onEdit}
        >
          <PencilIcon aria-hidden />
        </Button>
      </div>
      <dl className="mt-2 divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="text-end font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
