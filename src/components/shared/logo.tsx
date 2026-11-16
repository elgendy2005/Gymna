import { cn } from "@/lib/utils";

/** Wordmark with the "G" logo mark. Kept in Latin script in both locales. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-flex items-center gap-2 text-lg font-bold tracking-tight",
        className,
      )}
    >
      {/* Decorative: the wordmark next to it carries the name. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-[9px]"
      />
      <span>Gymna</span>
    </span>
  );
}
