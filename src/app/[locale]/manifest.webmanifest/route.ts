import type { MetadataRoute } from "next";
import { hasLocale } from "next-intl";
import { isRtl, routing } from "@/i18n/routing";
import ar from "../../../../messages/ar.json";
import en from "../../../../messages/en.json";

// Read from the files: the request-scoped translation helpers rely on root
// params, which Route Handlers cannot read.
const META = { ar: ar.Meta, en: en.Meta };

/**
 * The web app manifest, one per language: /ar/manifest.webmanifest and
 * /en/manifest.webmanifest. Every address in the app carries its locale, so
 * a single manifest could only ever open the installed app in one language.
 * `id` is the same in both, so they are one app to the browser.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/[locale]/manifest.webmanifest">,
) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response(null, { status: 404 });

  const manifest: MetadataRoute.Manifest = {
    id: "/",
    name: META[locale].title,
    short_name: "Gymna",
    description: META[locale].description,
    lang: locale,
    dir: isRtl(locale) ? "rtl" : "ltr",
    // Signed-out visitors are sent on to login by the proxy.
    start_url: `/${locale}/today`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The dark theme's background, as in the viewport themeColor.
    background_color: "#040f16",
    theme_color: "#040f16",
    categories: ["fitness", "health", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
