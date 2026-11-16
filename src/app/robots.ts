import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

// Signed-in screens only redirect a crawler to the login page, so they are
// kept out of the crawl. Keep in step with PROTECTED in src/proxy.ts.
const PRIVATE_SECTIONS = [
  "today",
  "dashboard",
  "onboarding",
  "plan",
  "workout",
  "exercises",
  "progress",
  "settings",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        ...routing.locales.flatMap((locale) =>
          PRIVATE_SECTIONS.map((section) => `/${locale}/${section}`),
        ),
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
