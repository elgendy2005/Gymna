"use client";

import { CheckIcon, FlameKindlingIcon, TrophyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { weightToKg, weightValue } from "@/lib/format";
import type { UnitSystem } from "@/lib/profile-options";
import { cn } from "@/lib/utils";
import { LIMITS } from "@/lib/validation/workout";
import type { WorkoutSet } from "@/lib/workout";

/** A number field that lets the user type freely and reports a value on blur. */
function NumberField({
  value,
  placeholder,
  label,
  decimal,
  max,
  disabled,
  onCommit,
}: {
  value: number | null;
  placeholder?: string;
  label: string;
  decimal: boolean;
  max: number;
  disabled?: boolean;
  onCommit: (value: number | null) => void;
}) {
  // Null while the field is not being edited, so outside changes show through.
  const [draft, setDraft] = useState<string | null>(null);
  // A ref, because focus and blur can both arrive before a render.
  const editing = useRef(false);

  // Reads the field itself: a blur can arrive before the last keystroke's
  // state update has rendered.
  const commit = (raw: string) => {
    if (!editing.current) return;
    editing.current = false;
    const text = raw.trim().replace(",", ".");
    setDraft(null);
    if (text === "") return onCommit(null);
    const number = Number(text);
    if (!Number.isFinite(number) || number < 0) return;
    const clamped = Math.min(number, max);
    onCommit(decimal ? clamped : Math.round(clamped));
  };

  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      aria-label={label}
      disabled={disabled}
      placeholder={placeholder}
      value={draft ?? (value === null ? "" : String(value))}
      onFocus={(event) => {
        editing.current = true;
        setDraft(value === null ? "" : String(value));
        event.currentTarget.select();
      }}
      onChange={(event) => {
        editing.current = true;
        setDraft(event.target.value);
      }}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-input bg-background text-center text-lg font-semibold tabular-nums outline-none transition-colors",
        "placeholder:font-normal placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:opacity-60 dark:bg-input/30",
      )}
    />
  );
}

/** One set: its number, weight, reps and the check button. */
export function SetRow({
  set,
  number,
  timed,
  bodyweight,
  unitSystem,
  onChange,
}: {
  set: WorkoutSet;
  /** 1-based position among sets of its kind. */
  number: number;
  timed: boolean;
  bodyweight: boolean;
  unitSystem: UnitSystem;
  onChange: (patch: Partial<WorkoutSet>) => void;
}) {
  const t = useTranslations("Workout");
  const warmup = set.kind === "WARMUP";
  const name = t(warmup ? "warmupLabel" : "setLabel", { number });

  return (
    <li
      className={cn(
        "grid grid-cols-[2.25rem_1fr_1fr_3rem] items-center gap-2 rounded-2xl p-1.5 transition-colors",
        set.done && "bg-brand/15",
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full text-sm font-semibold",
          warmup ? "border border-dashed border-border text-muted-foreground" : "bg-muted",
        )}
      >
        {/* An icon, not a letter: a lone "إ" or "W" read as a typo. The
            hidden name below still says "Warm-up 1". */}
        {warmup ? (
          <FlameKindlingIcon className="size-4" aria-hidden />
        ) : (
          <span aria-hidden>{number}</span>
        )}
        <span className="sr-only">{name}</span>
      </span>

      {bodyweight ? (
        <span className="grid h-12 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          {t("bodyweightShort")}
        </span>
      ) : (
        <NumberField
          label={t("weightInput", { set: name })}
          decimal
          max={weightValue(LIMITS.weightKg.max, unitSystem)}
          value={set.weightKg === null ? null : weightValue(set.weightKg, unitSystem)}
          onCommit={(value) =>
            onChange({ weightKg: value === null ? null : weightToKg(value, unitSystem) })
          }
        />
      )}

      <NumberField
        label={t(timed ? "secondsInput" : "repsInput", { set: name })}
        decimal={false}
        max={LIMITS.reps.max}
        value={set.reps}
        placeholder={String(set.targetReps)}
        onCommit={(value) => onChange({ reps: value })}
      />

      <button
        type="button"
        aria-pressed={set.done}
        aria-label={t(set.done ? "uncheck" : "check", { set: name })}
        onClick={() => onChange({ done: !set.done })}
        className={cn(
          "relative grid size-12 place-items-center rounded-xl border-2 outline-none transition-all active:scale-95",
          "focus-visible:ring-3 focus-visible:ring-ring/50",
          set.done
            ? "border-brand bg-brand text-primary-foreground"
            : "border-input text-muted-foreground hover:border-brand hover:text-foreground",
        )}
      >
        <CheckIcon className="size-6" strokeWidth={3} aria-hidden />
        {set.isPr && (
          <span className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-warning text-black">
            <TrophyIcon className="size-3" aria-hidden />
            <span className="sr-only">{t("pr")}</span>
          </span>
        )}
      </button>
    </li>
  );
}
