import { cn } from "@/lib/utils";

/** Wordmark with a dumbbell-plate mark. Kept in Latin script in both locales. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-flex items-center gap-2 text-lg font-bold tracking-tight",
        className,
      )}
    >
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
        aria-hidden
        focusable="false"
      >
        <rect width="32" height="32" rx="9" className="fill-brand" />
        <g className="fill-primary-foreground">
          <rect x="5" y="11" width="4" height="10" rx="1.5" />
          <rect x="23" y="11" width="4" height="10" rx="1.5" />
          <rect x="10" y="8" width="3.5" height="16" rx="1.5" />
          <rect x="18.5" y="8" width="3.5" height="16" rx="1.5" />
          <rect x="13" y="14.5" width="6" height="3" />
        </g>
      </svg>
      <span>Gymna</span>
    </span>
  );
}
