"use client";

import { MotionConfig } from "motion/react";
import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";
import { THEME_INIT_SCRIPT } from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  // The theme script goes into the server HTML once, ahead of the markup,
  // so the saved theme applies before first paint. Rendering a <script> in
  // the React tree instead makes React warn on every client render.
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
  });

  // "user" turns off transform and layout animations for visitors who ask
  // their system for reduced motion.
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
