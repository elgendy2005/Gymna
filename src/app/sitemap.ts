import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap((path) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
    );
    return routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.5,
      alternates: { languages },
    }));
  });
}
