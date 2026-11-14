"use client";

import { CheckIcon } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type Option<T> = { value: T; title: string; body?: string };

type ChoiceProps<T> = {
  legend: string;
  /** Hide the legend visually when a heading above already says it. */
  hideLegend?: boolean;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
};

/**
 * Large radio cards with a title and description. Native radio inputs keep
 * arrow-key navigation and screen reader semantics.
 */
export function ChoiceCards<T extends string | number>({
  legend,
  hideLegend,
  options,
  value,
  onChange,
  error,
}: ChoiceProps<T>) {
  const name = useId();
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className={cn("mb-3 text-sm font-medium", hideLegend && "sr-only")}>
        {legend}
      </legend>
      <div className="grid gap-3">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={cn(
                "flex min-h-18 cursor-pointer items-center gap-4 rounded-2xl border bg-card p-4 transition-colors",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-input",
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{option.title}</span>
                {option.body && (
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                    {option.body}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                  checked
                    ? "border-brand bg-brand text-primary-foreground"
                    : "border-input",
                )}
              >
                {checked && <CheckIcon className="size-3.5" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Compact radio pills in one row, for short options like numbers. */
export function ChoicePills<T extends string | number>({
  legend,
  hideLegend,
  options,
  value,
  onChange,
  error,
  size = "md",
}: ChoiceProps<T> & { size?: "sm" | "md" }) {
  const name = useId();
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="min-w-0">
      <legend className={cn("mb-2 text-sm font-medium", hideLegend && "sr-only")}>
        {legend}
      </legend>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-xl border px-2 text-center font-semibold transition-colors",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                size === "sm" ? "h-10 text-sm" : "h-12",
                checked
                  ? "border-brand bg-brand text-primary-foreground"
                  : "border-border bg-card hover:border-input",
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              {option.title}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
