import { CheckIcon, ClockIcon, FlameIcon, PlayIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/shared/reveal";

/** Decorative product preview: today's workout card with a coach reply. */
export async function HeroPreview() {
  const t = await getTranslations("Landing.preview");

  const exercises = [
    { name: t("exercise1"), sets: 4, reps: "8–10", done: true },
    { name: t("exercise2"), sets: 3, reps: "10–12", done: true },
    { name: t("exercise3"), sets: 3, reps: "12–15", done: false },
  ];

  return (
    // The preview repeats what the page already says in text, so it is
    // hidden from assistive technology.
    <div className="relative mx-auto w-full max-w-sm sm:mb-28 lg:max-w-md" aria-hidden>
      <Reveal eager delay={0.2}>
        <div className="glass rounded-[2rem] p-5 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("today")}
              </p>
              <p className="text-xl font-bold">{t("dayTitle")}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 text-xs font-semibold text-brand-text">
              <FlameIcon className="size-3.5" />
              {t("streak", { count: 6 })}
            </span>
          </div>

          <ul className="mt-5 space-y-2.5">
            {exercises.map((exercise) => (
              <li
                key={exercise.name}
                className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3"
              >
                <span
                  className={
                    exercise.done
                      ? "grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-primary-foreground"
                      : "grid size-9 shrink-0 place-items-center rounded-xl border border-dashed border-input text-muted-foreground"
                  }
                >
                  {exercise.done ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <PlayIcon className="size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {exercise.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t("sets", { sets: exercise.sets, reps: exercise.reps })}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-base font-semibold text-primary-foreground">
              <PlayIcon className="size-4 fill-current" />
              {t("start")}
            </span>
            <span className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border px-3 text-sm text-muted-foreground">
              <ClockIcon className="size-4" />
              {t("duration")}
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal
        eager
        delay={0.45}
        className="relative -mt-3 ms-auto w-[88%] sm:absolute sm:-end-8 sm:-bottom-32 sm:mt-0 sm:w-72"
      >
        <div className="glass rounded-2xl p-3.5 shadow-xl shadow-black/30">
          <p className="ms-auto w-fit max-w-[90%] rounded-2xl rounded-ee-md bg-secondary px-3 py-2 text-xs leading-relaxed">
            {t("userMessage")}
          </p>
          <div className="mt-2.5 flex items-start gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-[0.65rem] font-bold text-primary-foreground">
              K
            </span>
            <div>
              <p className="text-[0.7rem] font-semibold text-brand-text">
                {t("coachName")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">
                {t("coachMessage")}
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
