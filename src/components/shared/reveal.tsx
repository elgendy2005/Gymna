"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds to wait before animating, for staggering siblings. */
  delay?: number;
  /**
   * For content visible on first paint. Uses a CSS animation, so the HTML
   * is never hidden while JavaScript loads.
   */
  eager?: boolean;
};

/** Fades and lifts content into place, on load or when scrolled into view. */
export function Reveal({ children, className, delay = 0, eager }: RevealProps) {
  if (eager) {
    return (
      <div
        className={cn(
          "animate-in fill-mode-both fade-in slide-in-from-bottom-4 duration-700",
          className,
        )}
        style={{ animationDelay: `${delay}s` }}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.6, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
}
