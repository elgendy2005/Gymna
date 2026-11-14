import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
  // Arabic is the product default; the visitor switches language explicitly.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export function isRtl(locale: string): boolean {
  return locale === "ar";
}
