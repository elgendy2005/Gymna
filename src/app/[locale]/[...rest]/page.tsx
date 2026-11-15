import { notFound } from "next/navigation";

/**
 * Any address under a locale that no other route matches. Without this
 * catch-all, Next answers with its own bare English 404 instead of the
 * translated `not-found.tsx` inside the locale layout.
 */
export default function UnknownPage() {
  notFound();
}
