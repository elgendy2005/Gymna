"use client";

import { SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { exerciseMediaUrl, FRAME_SIZE } from "@/lib/exercise-media";
import { EXERCISE_EQUIPMENT, MUSCLES } from "@/lib/exercise-options";
import {
  EMPTY_FILTERS,
  filterExercises,
  filtersToQuery,
  hasActiveFilters,
  MAX_QUERY_LENGTH,
  parseFilters,
  type ExerciseFilters,
  type ExerciseSummary,
} from "@/lib/exercise-search";
import { LEVELS } from "@/lib/profile-options";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

const selectClass =
  "h-12 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Search box, filters and the result grid for the exercise library. */
export function ExerciseBrowser({ exercises }: { exercises: ExerciseSummary[] }) {
  const t = useTranslations("Exercises");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const id = useId();

  // The URL seeds the filters, so a shared or revisited link opens the same
  // view. After that the state lives here and the URL follows it.
  const [filters, setFilters] = useState<ExerciseFilters>(() =>
    parseFilters(new URLSearchParams(searchParams.toString())),
  );
  const [visible, setVisible] = useState(PAGE_SIZE);

  const results = useMemo(() => filterExercises(exercises, filters), [exercises, filters]);
  const shown = results.slice(0, visible);

  function update(change: Partial<ExerciseFilters>) {
    const next = { ...filters, ...change };
    setFilters(next);
    setVisible(PAGE_SIZE);
    const query = filtersToQuery(next);
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }

  return (
    <div className="space-y-5">
      <search className="block space-y-3">
        <div className="relative">
          <label htmlFor={`${id}-q`} className="sr-only">
            {t("searchLabel")}
          </label>
          <SearchIcon
            className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id={`${id}-q`}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={MAX_QUERY_LENGTH}
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder={t("searchPlaceholder")}
            className="h-13 w-full rounded-2xl border border-input bg-card ps-12 pe-4 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <fieldset className="min-w-0">
          <legend className="sr-only">{t("muscleLabel")}</legend>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
            {[null, ...MUSCLES].map((muscle) => {
              const checked = filters.muscle === muscle;
              return (
                <label
                  key={muscle ?? "all"}
                  className={cn(
                    // `relative` keeps the visually hidden radio inside the
                    // scroller; without it the page itself scrolls sideways.
                    "relative flex h-10 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors",
                    "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                    checked
                      ? "border-brand bg-brand text-primary-foreground"
                      : "border-border bg-card hover:border-input",
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-muscle`}
                    className="sr-only"
                    checked={checked}
                    onChange={() => update({ muscle })}
                  />
                  {muscle ? t(`muscles.${muscle}`) : t("allMuscles")}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-equipment`} className="sr-only">
              {t("equipmentLabel")}
            </label>
            <select
              id={`${id}-equipment`}
              className={selectClass}
              value={filters.equipment ?? ""}
              onChange={(event) =>
                update({
                  equipment:
                    EXERCISE_EQUIPMENT.find((value) => value === event.target.value) ??
                    null,
                })
              }
            >
              <option value="">{t("allEquipment")}</option>
              {EXERCISE_EQUIPMENT.map((value) => (
                <option key={value} value={value}>
                  {t(`equipment.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-level`} className="sr-only">
              {t("levelLabel")}
            </label>
            <select
              id={`${id}-level`}
              className={selectClass}
              value={filters.level ?? ""}
              onChange={(event) =>
                update({
                  level: LEVELS.find((value) => value === event.target.value) ?? null,
                })
              }
            >
              <option value="">{t("allLevels")}</option>
              {LEVELS.map((value) => (
                <option key={value} value={value}>
                  {t(`level.${value}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </search>

      <div className="flex min-h-9 items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground">
          {t("resultCount", { count: results.length })}
        </p>
        {hasActiveFilters(filters) && (
          <Button variant="ghost" size="lg" onClick={() => update(EMPTY_FILTERS)}>
            <XIcon aria-hidden />
            {t("clearFilters")}
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <SearchXIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((exercise, index) => {
            const arabicName = locale === "ar" ? exercise.nameAr : null;
            return (
              <li key={exercise.slug}>
                <Link
                  href={`/exercises/${exercise.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card outline-none transition-colors hover:border-input focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="relative aspect-3/2 bg-muted">
                    {exercise.thumb && (
                      <Image
                        src={exerciseMediaUrl(exercise.thumb)}
                        alt=""
                        width={FRAME_SIZE.width}
                        height={FRAME_SIZE.height}
                        unoptimized
                        loading={index < 4 ? "eager" : "lazy"}
                        className="size-full object-cover"
                      />
                    )}
                    <span className="absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                      {t(`level.${exercise.difficulty}`)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <h2
                      // Names without an Arabic translation stay in English.
                      lang={arabicName ? undefined : "en"}
                      dir={arabicName ? undefined : "auto"}
                      className="line-clamp-2 text-sm leading-snug font-semibold text-pretty"
                    >
                      {arabicName ?? exercise.nameEn}
                    </h2>
                    <p className="mt-auto text-xs text-muted-foreground">
                      {[
                        exercise.primaryMuscles[0] &&
                          t(`muscles.${exercise.primaryMuscles[0]}`),
                        t(`equipment.${exercise.equipment}`),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {results.length > visible && (
        <Button
          variant="outline"
          size="xl"
          className="w-full"
          onClick={() => setVisible((count) => count + PAGE_SIZE)}
        >
          {t("showMore")}
        </Button>
      )}
    </div>
  );
}
