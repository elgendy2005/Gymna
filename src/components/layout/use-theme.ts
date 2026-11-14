"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import { applyTheme, readStoredTheme, storeTheme, type Theme } from "./theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "dark";
}

/** Current theme, read from the `dark` class on <html>. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // In development, Strict Mode's remount resets <html> to its JSX
  // attributes and drops what the inline script set. Re-apply before paint.
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
    applyTheme(next);
  }, []);

  return { theme, setTheme };
}
