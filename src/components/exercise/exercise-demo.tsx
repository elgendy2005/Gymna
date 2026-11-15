"use client";

import { ImageOffIcon, PauseIcon, PlayIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { exerciseMediaUrl, FRAME_SIZE } from "@/lib/exercise-media";
import type { MediaKind } from "@/lib/exercise-options";
import { cn } from "@/lib/utils";

type DemoMedia = { kind: MediaKind; urls: string[] };

type ExerciseDemoProps = {
  /** Best first. The first kind this player can show is used. */
  media: readonly DemoMedia[];
  alt: string;
  labels: { play: string; pause: string; empty: string };
};

// Lottie needs a player library; rows of that kind are skipped until one
// is added, and the next best media plays instead.
const PLAYABLE: readonly MediaKind[] = ["VIDEO", "GIF", "FRAME_SEQUENCE"];

const FRAME_MS = 1100;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Plays the demo for an exercise: a video, a GIF, or looping photo frames. */
export function ExerciseDemo({ media, alt, labels }: ExerciseDemoProps) {
  const item = media.find(
    (candidate) => PLAYABLE.includes(candidate.kind) && candidate.urls.length > 0,
  );

  return (
    <div className="relative aspect-3/2 overflow-hidden rounded-3xl border border-border bg-muted">
      {!item ? (
        <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
          <div className="space-y-2">
            <ImageOffIcon className="mx-auto size-8" aria-hidden />
            <p>{labels.empty}</p>
          </div>
        </div>
      ) : item.kind === "VIDEO" ? (
        <video
          src={exerciseMediaUrl(item.urls[0])}
          aria-label={alt}
          className="size-full object-cover"
          controls
          loop
          muted
          playsInline
          preload="metadata"
        />
      ) : item.kind === "GIF" ? (
        <Image
          src={exerciseMediaUrl(item.urls[0])}
          alt={alt}
          fill
          unoptimized
          sizes="(min-width: 768px) 736px, 100vw"
          className="object-cover"
        />
      ) : (
        <FrameSequence urls={item.urls} alt={alt} labels={labels} />
      )}
    </div>
  );
}

function FrameSequence({
  urls,
  alt,
  labels,
}: {
  urls: string[];
  alt: string;
  labels: ExerciseDemoProps["labels"];
}) {
  const reducedMotion = usePrefersReducedMotion();
  // null until the user presses the button; then their choice wins.
  const [choice, setChoice] = useState<boolean | null>(null);
  const [frame, setFrame] = useState(0);

  const animated = urls.length > 1;
  const playing = animated && (choice ?? !reducedMotion);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setFrame((current) => (current + 1) % urls.length),
      FRAME_MS,
    );
    return () => clearInterval(timer);
  }, [playing, urls.length]);

  return (
    <>
      {urls.map((url, index) => (
        <Image
          key={url}
          src={exerciseMediaUrl(url)}
          // One description is enough; the other frames are the same move.
          alt={index === 0 ? alt : ""}
          width={FRAME_SIZE.width}
          height={FRAME_SIZE.height}
          unoptimized
          loading="eager"
          fetchPriority={index === 0 ? "high" : "auto"}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-300",
            index === frame ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {animated && (
        <>
          <div
            aria-hidden
            className="absolute start-3 bottom-3 flex gap-1.5 rounded-full bg-black/55 px-2.5 py-2"
          >
            {urls.map((url, index) => (
              <span
                key={url}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  index === frame ? "bg-brand" : "bg-white/50",
                )}
              />
            ))}
          </div>
          <Button
            type="button"
            size="icon-xl"
            aria-label={playing ? labels.pause : labels.play}
            onClick={() => setChoice(!playing)}
            className="absolute end-3 bottom-3 rounded-full shadow-lg"
          >
            {playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
          </Button>
        </>
      )}
    </>
  );
}
