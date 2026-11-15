import type { Muscle } from "@/lib/exercise-options";
import { cn } from "@/lib/utils";
import { BODY_REGIONS, BODY_VIEWBOX } from "./body-map-data";

type MuscleMapProps = {
  primary: readonly Muscle[];
  secondary: readonly Muscle[];
  /** Text alternative naming the highlighted muscles. */
  label: string;
  frontLabel: string;
  backLabel: string;
  className?: string;
};

/** Front and back body outlines with the worked muscles filled in. */
export function MuscleMap({
  primary,
  secondary,
  label,
  frontLabel,
  backLabel,
  className,
}: MuscleMapProps) {
  const tone = (muscles: readonly Muscle[]) => {
    if (muscles.some((muscle) => primary.includes(muscle))) {
      return "fill-brand stroke-brand-text";
    }
    if (muscles.some((muscle) => secondary.includes(muscle))) {
      return "fill-brand/35 stroke-brand-text/60";
    }
    return "fill-muted-foreground/15 stroke-muted-foreground/25";
  };

  return (
    <div role="img" aria-label={label} className={cn("grid grid-cols-2 gap-4", className)}>
      {(["front", "back"] as const).map((side) => (
        <div key={side} className="flex flex-col items-center gap-2">
          <BodyFigure side={side} tone={tone} className="h-56 w-auto max-w-full" />
          <span className="text-xs text-muted-foreground">
            {side === "front" ? frontLabel : backLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One side of the body outline. `tone` returns the classes for a region. */
export function BodyFigure({
  side,
  tone,
  className,
}: {
  side: "front" | "back";
  tone: (muscles: readonly Muscle[]) => string;
  className?: string;
}) {
  return (
    <svg viewBox={BODY_VIEWBOX} className={className} aria-hidden>
      {BODY_REGIONS[side].map((region, index) => (
        <polygon
          key={index}
          points={region.points}
          strokeWidth={0.5}
          strokeLinejoin="round"
          className={tone(region.muscles)}
        />
      ))}
    </svg>
  );
}
