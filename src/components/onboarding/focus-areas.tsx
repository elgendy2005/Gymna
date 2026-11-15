"use client";

import { CheckIcon } from "lucide-react";
import { useId } from "react";
import { BodyFigure } from "@/components/exercise/muscle-map";
import { FOCUS_AREA_MUSCLES, type Muscle } from "@/lib/exercise-options";
import { FOCUS_AREAS, MAX_FOCUS_AREAS, type FocusArea } from "@/lib/profile-options";
import { cn } from "@/lib/utils";

/**
 * Multi-select grid of body areas, each drawn on the body outline. Native
 * checkboxes keep keyboard and screen reader behaviour.
 */
export function FocusAreaGrid({
  legend,
  hideLegend,
  hint,
  labels,
  value,
  onChange,
  error,
}: {
  legend: string;
  hideLegend?: boolean;
  /** Says how many can be picked. */
  hint: string;
  labels: Record<FocusArea, string>;
  value: readonly FocusArea[];
  onChange: (value: FocusArea[]) => void;
  error?: string | null;
}) {
  const id = useId();
  const full = value.length >= MAX_FOCUS_AREAS;

  const toggle = (area: FocusArea) => {
    onChange(
      value.includes(area)
        ? value.filter((item) => item !== area)
        : // Keep the list in display order.
          FOCUS_AREAS.filter((item) => item === area || value.includes(item)),
    );
  };

  return (
    <fieldset aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}>
      <legend className={cn("mb-1 text-sm font-medium", hideLegend && "sr-only")}>
        {legend}
      </legend>
      <p id={`${id}-hint`} className="mb-3 text-sm text-muted-foreground">
        {hint}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FOCUS_AREAS.map((area) => {
          const checked = value.includes(area);
          const { side, muscles } = FOCUS_AREA_MUSCLES[area];
          const tone = (regionMuscles: readonly Muscle[]) =>
            regionMuscles.some((muscle) => muscles.includes(muscle))
              ? "fill-brand stroke-brand-text"
              : "fill-muted-foreground/15 stroke-muted-foreground/25";

          return (
            <label
              key={area}
              className={cn(
                "relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border bg-card p-3 pt-4 transition-colors",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked ? "border-brand bg-brand/10" : "border-border hover:border-input",
                !checked && full && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={!checked && full}
                onChange={() => toggle(area)}
              />
              <span
                aria-hidden
                className={cn(
                  "absolute end-2.5 top-2.5 grid size-6 place-items-center rounded-full border transition-colors",
                  checked
                    ? "border-brand bg-brand text-primary-foreground"
                    : "border-input",
                )}
              >
                {checked && <CheckIcon className="size-3.5" strokeWidth={3} />}
              </span>
              <BodyFigure side={side} tone={tone} className="h-28 w-auto" />
              <span className="font-semibold">{labels[area]}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Seven weekday toggles, Saturday first. Picking stops at `count` days. */
export function TrainingDaysPicker({
  legend,
  hint,
  labels,
  names,
  count,
  value,
  onChange,
  error,
}: {
  legend: string;
  hint: string;
  /** Short weekday names, index 0 = Saturday. */
  labels: readonly string[];
  /** Full weekday names, read out in place of the short ones. */
  names: readonly string[];
  count: number;
  value: readonly number[];
  onChange: (value: number[]) => void;
  error?: string | null;
}) {
  const id = useId();
  const full = value.length >= count;

  return (
    <fieldset aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} className="min-w-0">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <p id={`${id}-hint`} className="mb-2 text-sm text-muted-foreground">
        {hint}
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {labels.map((label, day) => {
          const checked = value.includes(day);
          return (
            <label
              key={day}
              className={cn(
                "flex h-12 cursor-pointer items-center justify-center rounded-xl border px-0.5 text-center text-xs font-semibold transition-colors sm:text-sm",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked
                  ? "border-brand bg-brand text-primary-foreground"
                  : "border-border bg-card hover:border-input",
                !checked && full && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={!checked && full}
                onChange={() =>
                  onChange(
                    checked
                      ? value.filter((item) => item !== day)
                      : [...value, day].sort((a, b) => a - b),
                  )
                }
              />
              <span aria-hidden>{label}</span>
              <span className="sr-only">{names[day]}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
