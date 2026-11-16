/** Above this many uses per exercise in a week, the plan reads as "the same few moves". */
export const REPEAT_LIMIT = 2.5;
/** With this few different exercises, using each of them twice is already noticeable. */
export const SMALL_POOL = 6;

type Week = readonly { exercises: readonly { slug: string }[] }[];

/**
 * True when the week leans on too few different exercises: the equipment
 * and health filters left so little to choose from that the same moves come
 * back most days. The plan page says so instead of leaving it unexplained.
 */
export function isPlanRepetitive(days: Week): boolean {
  const slugs = days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));
  const distinct = new Set(slugs).size;
  if (days.length < 2 || distinct === 0) return false;
  const uses = slugs.length / distinct;
  return uses > REPEAT_LIMIT || (distinct <= SMALL_POOL && uses >= 2);
}
