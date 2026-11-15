"use client";

import { useEffect } from "react";

/**
 * Registers the offline-page service worker (public/sw.js).
 *
 * Production only: in development a worker sitting between the browser and
 * the dev server would get in the way of hot reloading.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Without the worker the app still works; only the offline page is lost.
      });
  }, []);

  return null;
}
