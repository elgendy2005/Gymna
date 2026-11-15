"use client";

import { PlusIcon, SkipForwardIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

type Rest = { endsAt: number; total: number };

const EXTRA_SECONDS = 15;
/** How long "Rest over" stays on screen. */
const DONE_VISIBLE_MS = 4000;

const storageKey = (sessionId: string) => `gymna.workout.${sessionId}.rest`;

function load(sessionId: string): Rest | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey(sessionId)) ?? "null");
    if (saved && typeof saved.endsAt === "number" && typeof saved.total === "number") return saved;
  } catch {
    // No saved timer is fine.
  }
  return null;
}

function store(sessionId: string, rest: Rest | null) {
  try {
    if (rest) window.localStorage.setItem(storageKey(sessionId), JSON.stringify(rest));
    else window.localStorage.removeItem(storageKey(sessionId));
  } catch {
    // The timer still runs in memory.
  }
}

/** Two short beeps. Needs a context that a tap has already unlocked. */
function beep(context: AudioContext | null) {
  if (!context || context.state !== "running") return;
  for (const offset of [0, 0.25]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + 0.2);
  }
}

/** Vibrates where the browser can (not on iOS). */
export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Haptics are a nicety.
  }
}

/**
 * The rest countdown between sets. The end time is kept in localStorage,
 * so a refresh in the middle of a rest picks the countdown back up.
 */
export function useRestTimer(sessionId: string) {
  const [rest, setRest] = useState<Rest | null>(null);
  const [now, setNow] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const rang = useRef(false);

  // Restored after hydration: the server render cannot see localStorage.
  useEffect(() => {
    const saved = load(sessionId);
    if (saved && saved.endsAt > Date.now() - DONE_VISIBLE_MS) {
      rang.current = saved.endsAt <= Date.now();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage and the clock
      setRest(saved);
      setNow(Date.now());
    }
  }, [sessionId]);

  // Ticks only while a rest is on screen. The cleanup also pauses it when
  // the page is hidden by a navigation.
  useEffect(() => {
    if (!rest) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= rest.endsAt && !rang.current) {
        rang.current = true;
        beep(audio.current);
        buzz([200, 100, 200]);
      }
      if (time >= rest.endsAt + DONE_VISIBLE_MS) {
        setRest(null);
        store(sessionId, null);
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [rest, sessionId]);

  const set = useCallback(
    (next: Rest | null) => {
      rang.current = false;
      setRest(next);
      setNow(Date.now());
      store(sessionId, next);
    },
    [sessionId],
  );

  /** Starts a rest. Call from a tap, so the sound is allowed to play later. */
  const start = useCallback(
    (seconds: number) => {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
      } catch {
        // No sound, the countdown still shows.
      }
      set({ endsAt: Date.now() + seconds * 1000, total: seconds });
    },
    [set],
  );

  const extend = useCallback(() => {
    if (!rest) return;
    const base = Math.max(rest.endsAt, Date.now());
    set({ endsAt: base + EXTRA_SECONDS * 1000, total: rest.total + EXTRA_SECONDS });
  }, [rest, set]);

  const skip = useCallback(() => set(null), [set]);

  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  return { active: rest !== null, remaining, total: rest?.total ?? 0, start, extend, skip };
}

export type RestTimer = ReturnType<typeof useRestTimer>;

/** The countdown bar pinned to the bottom of the workout screen. */
export function RestTimerBar({ timer }: { timer: RestTimer }) {
  const t = useTranslations("Workout.rest");
  if (!timer.active) return null;

  const over = timer.remaining === 0;
  const share = timer.total > 0 ? timer.remaining / timer.total : 0;

  return (
    <div
      role="timer"
      aria-label={t("title")}
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div
        className={cn(
          "mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-xl",
          over && "border-brand",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{over ? t("over") : t("title")}</p>
          <p className="text-3xl font-bold tabular-nums" aria-live="off">
            <bdi>{formatClock(timer.remaining)}</bdi>
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full origin-left rounded-full bg-brand transition-transform duration-300 ease-linear rtl:origin-right"
              style={{ transform: `scaleX(${share})` }}
            />
          </div>
        </div>
        {!over && (
          <Button variant="outline" size="xl" className="px-4" onClick={timer.extend}>
            <PlusIcon aria-hidden />
            {t("extend")}
          </Button>
        )}
        <Button variant={over ? "default" : "outline"} size="xl" className="px-4" onClick={timer.skip}>
          {!over && <SkipForwardIcon className="rtl:rotate-180" aria-hidden />}
          {over ? t("dismiss") : t("skip")}
        </Button>
      </div>
    </div>
  );
}
