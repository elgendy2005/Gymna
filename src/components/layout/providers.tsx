"use client";

import { MotionConfig } from "motion/react";

export function Providers({ children }: { children: React.ReactNode }) {
  // "user" turns off transform and layout animations for visitors who ask
  // their system for reduced motion.
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
