"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const COLORS = ["var(--brand)", "var(--warning)", "var(--foreground)", "var(--brand-text)"];
const PIECES = 60;

type Piece = {
  left: number;
  drift: number;
  delay: number;
  duration: number;
  rotate: number;
  size: number;
  color: string;
  round: boolean;
};

function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, index) => ({
    left: Math.random() * 100,
    drift: (Math.random() - 0.5) * 160,
    delay: Math.random() * 0.6,
    duration: 2.2 + Math.random() * 1.6,
    rotate: (Math.random() - 0.5) * 900,
    size: 6 + Math.random() * 7,
    color: COLORS[index % COLORS.length],
    round: index % 3 === 0,
  }));
}

/** One burst of confetti over the page. Decorative, and skipped for reduced motion. */
export function Confetti() {
  const reduced = useReducedMotion();
  // Random positions are made after mount so the server render has none.
  const [pieces, setPieces] = useState<Piece[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random values must not differ between server and client
    setPieces(makePieces());
  }, []);

  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((piece, index) => (
        <motion.span
          key={index}
          className="absolute top-0 block"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 0.45,
            borderRadius: piece.round ? "50%" : 2,
            background: piece.color,
          }}
          initial={{ y: "-5vh", x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", x: piece.drift, rotate: piece.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: piece.duration, delay: piece.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
