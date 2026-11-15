// Search and filtering for the exercise library. Runs in the browser over
// the whole index, so typing gives results without a round trip.

import {
  EXERCISE_EQUIPMENT,
  MUSCLES,
  type ExerciseEquipment,
  type Muscle,
} from "@/lib/exercise-options";
import { LEVELS, type Level } from "@/lib/profile-options";

/** What a library card needs. */
export type ExerciseSummary = {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  equipment: ExerciseEquipment;
  difficulty: Level;
  primaryMuscles: Muscle[];
  /** Part of the curated set, with Arabic text and coaching notes. */
  curated: boolean;
  /** First demo frame, as a path under the media base URL. */
  thumb: string | null;
};

export type ExerciseFilters = {
  query: string;
  muscle: Muscle | null;
  equipment: ExerciseEquipment | null;
  level: Level | null;
};

export const EMPTY_FILTERS: ExerciseFilters = {
  query: "",
  muscle: null,
  equipment: null,
  level: null,
};

export const MAX_QUERY_LENGTH = 60;

/**
 * Folds text so a search matches however it was typed: case, Arabic
 * diacritics, and the letter variants people use interchangeably
 * (أ/إ/آ/ا, ة/ه, ى/ي). Punctuation becomes spaces.
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function hasActiveFilters(filters: ExerciseFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.muscle !== null ||
    filters.equipment !== null ||
    filters.level !== null
  );
}

/** Keeps the order of `exercises`. Every word of the query must match. */
export function filterExercises<T extends ExerciseSummary>(
  exercises: readonly T[],
  filters: ExerciseFilters,
): T[] {
  const words = normalizeSearchText(filters.query).split(" ").filter(Boolean);

  return exercises.filter((exercise) => {
    if (filters.muscle && !exercise.primaryMuscles.includes(filters.muscle)) return false;
    if (filters.equipment && exercise.equipment !== filters.equipment) return false;
    if (filters.level && exercise.difficulty !== filters.level) return false;
    if (words.length === 0) return true;
    const haystack = normalizeSearchText(`${exercise.nameEn} ${exercise.nameAr ?? ""}`);
    return words.every((word) => haystack.includes(word));
  });
}

function oneOf<T extends string>(values: readonly T[], value: string | null): T | null {
  return value !== null && (values as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Reads filters from a query string, ignoring anything unrecognised. */
export function parseFilters(params: URLSearchParams): ExerciseFilters {
  return {
    query: (params.get("q") ?? "").slice(0, MAX_QUERY_LENGTH),
    muscle: oneOf(MUSCLES, params.get("muscle")),
    equipment: oneOf(EXERCISE_EQUIPMENT, params.get("equipment")),
    level: oneOf(LEVELS, params.get("level")),
  };
}

/** The query string for a set of filters, without the leading "?". */
export function filtersToQuery(filters: ExerciseFilters): string {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query) params.set("q", query);
  if (filters.muscle) params.set("muscle", filters.muscle);
  if (filters.equipment) params.set("equipment", filters.equipment);
  if (filters.level) params.set("level", filters.level);
  return params.toString();
}
