"use client";

import { useState } from "react";

export type ChartPoint = {
  /** Shown in the tooltip and on the axis, already formatted. */
  label: string;
  /** In the user's display unit. */
  value: number;
};

const WIDTH = 320;
const HEIGHT = 160;
const PAD = { top: 22, right: 14, bottom: 10, left: 14 };

/**
 * Estimated one-rep max over time: one line, a dot per workout and a medal
 * on the best one. Tap or hover a dot for its value. The history list
 * under the chart carries the same numbers as text.
 */
export function E1rmChart({
  points,
  unit,
  title,
  bestLabel,
}: {
  points: ChartPoint[];
  unit: string;
  /** Accessible name, e.g. "Estimated max over time". */
  title: string;
  bestLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return null;

  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  // A flat series still needs a band to sit in.
  const spread = high - low || Math.max(1, high * 0.1);
  const min = low - spread * 0.15;
  const max = high + spread * 0.15;

  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const y = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * innerHeight;

  const best = values.indexOf(high);
  const shown = active ?? best;
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`).join(" ");

  return (
    // Charts read left to right in both languages, like the numbers in them.
    <figure className="space-y-1" dir="ltr">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={title}
        className="w-full touch-pan-y select-none"
        onPointerLeave={() => setActive(null)}
      >
        {[min, max].map((value, index) => (
          <line
            key={index}
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(index ? high : low)}
            y2={y(index ? high : low)}
            className="stroke-border"
            strokeDasharray="3 4"
          />
        ))}
        <path d={path} fill="none" className="stroke-brand-text" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r={index === shown ? 5.5 : 4}
              className="fill-brand-text stroke-card"
              strokeWidth={2}
            />
            {/* A hit target larger than the dot. */}
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r={16}
              fill="transparent"
              onPointerEnter={() => setActive(index)}
              onPointerDown={() => setActive(index)}
            />
          </g>
        ))}

        {/* The medal marks the best workout. */}
        <g transform={`translate(${x(best)}, ${y(high) - 13})`} aria-hidden>
          <circle r={7} className="fill-warning stroke-card" strokeWidth={2} />
          <path d="M-2.6,-0.2 L-0.8,1.9 L2.8,-1.9" fill="none" stroke="black" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>

      </svg>
      {/* The value under the pointer, or the best one. Plain text, so it wraps and never clips. */}
      <p className="text-center text-sm tabular-nums" aria-live="polite">
        <span className="font-semibold">
          {points[shown].value} {unit}
        </span>
        <span className="text-muted-foreground">
          {" · "}
          {points[shown].label}
          {shown === best ? ` · ${bestLabel}` : ""}
        </span>
      </p>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{points[0].label}</span>
        {points.length > 1 && <span>{points[points.length - 1].label}</span>}
      </figcaption>
    </figure>
  );
}
